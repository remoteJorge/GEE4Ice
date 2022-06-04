/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var gl_shp = ee.FeatureCollection("users/remote_jorge/Aneto2020"),
    ROI = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[0.6357601376281252, 42.645074783276755],
          [0.6357601376281252, 42.62846832666558],
          [0.6611660214171877, 42.62846832666558],
          [0.6611660214171877, 42.645074783276755]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//  --- Set center in study area
Map.setCenter(0.64855, 42.63825, 15); //


// --- FUNCTIONS  --------------------------------------------------------------------------------------------------------------

// - Delete clouds function  
function maskS2clouds(image) {
  var qa = image.select('QA60');
  
  // Bits 10 and 11 are clouds and cirrus
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;
  
  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));
      
  return image.updateMask(mask);
}

// - NDSI Index Function
var addNDSI = function(image) {
  var ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI');
  
  return image.addBands(ndsi);
};

// - Clip NDSI Index to glacier extent
var clipNDSI = function(image) {
  var imgclipped = image.clip(gl_shp);
  
  return imgclipped;
};


// - Clip Image to Region Of Interest (ROI) for RGB visualization
var clipROI = function(image) {
  var imgclipped = image.clip(ROI);
  
  return imgclipped;
};


// - Compute the Mean NDSI of every index
var ndsimean = function(image) {
  var meanDictionary = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: gl_shp.geometry()});
    
    return meanDictionary;
};


// - Add mean NDSI to the Image in ImageCollection
var stats = function(image) {
  var stats1 = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: gl_shp,
  });
  return image.set(stats1);
};


// - Rrs (reflectance) values  in GEE are multiplied by 10000. To scale them is necessary to divide by 10000
var scaleNIR = function(image) {
  var NIRscaled = image.select('B8').divide(10000).rename('B8scaled');
  var bands = image.select('NDSI').addBands(NIRscaled);
  return bands;
};

// - Create a Mask to Snow/Ice thresholding

var icesnowmask = function(image) {
  
  var maskbands = image.select(['NDSI','B8scaled']);
  var ice = maskbands.select('NDSI').gte(0.4).and(maskbands.select('B8scaled').gte(0.4)).eq(1).rename('Ice_mask');
  var snw = maskbands.select('NDSI').gte(0.4).and(maskbands.select('B8scaled').lte(0.4)).eq(1).rename('Snow_mask');
  
  image =  image.addBands(ice);
  image =  image.addBands(snw);
  
  var ice_stats = ice.reduceRegion({
    reducer: ee.Reducer.sum(), 
    geometry: gl_shp, 
    scale: 10,
  });
  
  
  var snow_stats = snw.reduceRegion({
    reducer: ee.Reducer.sum(), 
    geometry: gl_shp, 
    scale: 10,
  });

  image = image.set(ice_stats);
  image = image.set(snow_stats);
  

  return image;
};

// - Calculate % of snow

var snowpercentage = function(image) {
  
  var getsnw = ee.Number(image.get('Snow_mask'));
  var getice = ee.Number(image.get('Ice_mask'));
  var totalArea = getsnw.add(getice);
  var snwpct =  getice.divide(totalArea).multiply(100);
  image = image.addBands(snwpct);
  image = image.set('snow_%',snwpct);
  
  return image;
};


// - Configure  NDSI & NIR visualization parameters
var ndsiViz = {bands:'NDSI', min: 0, max: 1, palette: ['#800000','#0000FF','00FFFF','FF00FF']};
var NIRViz = {bands:'B8scaled', min:0, max: 1};
var maskViz = {bands : 'Ice_mask', min:0, max:1,palette: ['#2980B9','#D2B4DE']};

// - Configure  RGB visualization parameters
var rgbprms = {bands:["B4","B3","B2"], gamma: 1, max: 8354.955450606461, min: -729.5198445458559, opacity: 1};



// --- NDSI Index  --------------------------------------------------------------------------------------------------------------

// - Define filter NDSI parameters
var S2_Glacier_ndsi_params  = ee.ImageCollection("COPERNICUS/S2_SR")
          .filterBounds(gl_shp)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
          .map(maskS2clouds)
          .select('B3','B11','B8')
          .map(addNDSI)
          .select('NDSI','B8')
          .map(clipNDSI)
          .map(stats);



// - Create a list with not valid images in the ImageCollection >> copy the 'system index' and add as string to the list

var lst2rmv17 = (['20170406T105021_20170406T105317_T30TYN','20170406T105021_20170406T105317_T31TCH','20170526T105031_20170526T105518_T30TYN', 
                  '20170814T105031_20170814T105517_T30TYN','20170913T105021_20170913T105335_T30TYN', '20170913T105021_20170913T105335_T31TCH']);

var lst2rmv18 = (['20180421T105031_20180421T105629_T31TCH', '20180511T105031_20180511T105804_T30TYN','20180511T105031_20180511T105804_T31TCH',
                  '20180630T105031_20180630T105440_T30TYN','20180630T105031_20180630T105440_T31TCH', '20180903T105019_20180903T105654_T31TCH',
                  '20181003T105019_20181003T105619_T30TYN']);

var lst2rmv19 = (['20190501T105039_20190501T105819_T30TYN', '20190501T105039_20190501T105819_T31TCH','20190506T105031_20190506T105031_T30TYN',
                  '20190715T105031_20190715T105159_T31TCH','20190824T105031_20190824T105344_T30TYN', '20190903T105031_20190903T105715_T31TCH']);
                  
var lst2rmv20 = (['']);

var lst2rmv21 = (['20211027T105049_20211027T105044_T30TYN', '20211027T105049_20211027T105044_T31TCH']);


// - Filter NDSI by date
var Glacier_S2_ndsi_2021 = S2_Glacier_ndsi_params.filterDate('2021-04-01', '2021-11-01')
                         .filter(ee.Filter.inList('system:index', lst2rmv21).not())
                         .map(scaleNIR)
                         .map(icesnowmask)
                         .map(snowpercentage);


                         
var Glacier_S2_ndsi_2020 = S2_Glacier_ndsi_params.filterDate('2020-04-01', '2020-11-01')
                         .filter(ee.Filter.inList('system:index', lst2rmv20).not())
                         .map(scaleNIR)
                         .map(icesnowmask)
                         .map(snowpercentage);

var Glacier_S2_ndsi_2019 = S2_Glacier_ndsi_params.filterDate('2019-04-01', '2019-11-01')
                         .filter(ee.Filter.inList('system:index', lst2rmv19).not())
                         .map(scaleNIR)
                         .map(icesnowmask)
                         .map(snowpercentage);

var Glacier_S2_ndsi_2018 = S2_Glacier_ndsi_params.filterDate('2018-04-01', '2018-11-01')
                         .filter(ee.Filter.inList('system:index', lst2rmv18).not())
                         .map(scaleNIR)
                         .map(icesnowmask)
                         .map(snowpercentage);

var Glacier_S2_ndsi_2017 = S2_Glacier_ndsi_params.filterDate('2017-04-01', '2017-11-01')    
                        .filter(ee.Filter.inList('system:index', lst2rmv17).not())
                        .map(scaleNIR)
                        .map(icesnowmask)
                        .map(snowpercentage)


// - See NDSI results in Console
print('Glacier_S2_ndsi_2021',Glacier_S2_ndsi_2021);
print('Glacier_S2_ndsi_2020',Glacier_S2_ndsi_2020);
print('Glacier_S2_ndsi_2019',Glacier_S2_ndsi_2019);
print('Glacier_S2_ndsi_2018',Glacier_S2_ndsi_2018);
print('Glacier_S2_ndsi_2017',Glacier_S2_ndsi_2017);

// --- RGB  ------------------------------------------------------------------------------------------------------------------

// - Define filter RGB parameters
var S2_Glacier_rgb_params  = ee.ImageCollection("COPERNICUS/S2_SR")
          .filterBounds(ROI)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
          .map(maskS2clouds)
          .select('B2','B3','B4')
          .map(clipROI);
          
// - Filter RGB by date     
var Glacier_S2_rgb_2021 = S2_Glacier_rgb_params.filterDate('2021-04-01', '2021-11-01')
                          .filter(ee.Filter.inList('system:index', lst2rmv21).not());
                          
var Glacier_S2_rgb_2020 = S2_Glacier_rgb_params.filterDate('2020-04-01', '2020-11-01')
                          .filter(ee.Filter.inList('system:index', lst2rmv20).not());
                          
var Glacier_S2_rgb_2019 = S2_Glacier_rgb_params.filterDate('2019-04-01', '2019-11-01')
                          .filter(ee.Filter.inList('system:index', lst2rmv19).not());
                          
var Glacier_S2_rgb_2018 = S2_Glacier_rgb_params.filterDate('2018-04-01', '2018-11-01')
                          .filter(ee.Filter.inList('system:index', lst2rmv18).not());
                          
var Glacier_S2_rgb_2017 = S2_Glacier_rgb_params.filterDate('2017-04-01', '2017-11-01')
                          .filter(ee.Filter.inList('system:index', lst2rmv17).not());


// - See NDSI results in Console
//print('Glacier_S2_rgb_2021',Glacier_S2_rgb_2021);
// print('Glacier_S2_rgb_2020',Glacier_S2_rgb_2020);
// print('Glacier_S2_rgb_2019',Glacier_S2_rgb_2019);
// print('Glacier_S2_rgb_2018',Glacier_S2_rgb_2018);
// print('Glacier_S2_rgb_2017',Glacier_S2_rgb_2017);

// ---  MAP LAYOUT & RESULTS  ---------------------------------------------------------------------------------------------------

// - Specify NDSI Index & RGB from ImageCollections in Console > ImageCollection COPERNICUS/S2_SR > features 
var selectlist = 4;
var selectNDSI = Glacier_S2_ndsi_2019
var selectRGB = Glacier_S2_rgb_2019

// -  NDSI Index selected to see in Map Layout
var listOfIndex = selectNDSI.toList(selectNDSI.size())
var ndsi_selected = ee.Image(listOfIndex.get(selectlist));

// - RGB image selected to see in Map Layout
var listOfImages = selectRGB.toList(selectRGB.size())
var rgb_selected = ee.Image(listOfImages.get(selectlist));


// - See NDSI, NIRclstr & RGB selected
print(rgb_selected, 'Selected Img Properties');
Map.addLayer(rgb_selected,rgbprms,'RGB_selected');

Map.addLayer(ndsi_selected.select('B8scaled'), NIRViz,'NIR_selected');
Map.addLayer(ndsi_selected.select('Ice_mask'),maskViz,'Snow/Ice mask');

print(ndsi_selected, 'Selected Index Properties');
Map.addLayer(ndsi_selected.select('NDSI'),ndsiViz,'NDSI_selected');



//  --- NDSI TIME SERIES CHART  ------------------------------------------------------------------------------------------
//  --- Anual NDSI Mean  ------------
var NDSIChart = ui.Chart.image.seriesByRegion({
  imageCollection: selectNDSI, //Or year to analyse >> Glacier_S2_ndsi_20XX
  regions: gl_shp,
  reducer: ee.Reducer.mean(), //ee.Reducer.median(), 
  scale: 10, 
  seriesProperty: 'NDSI' 
})
  .setOptions({
    title: 'Glacier Sentinel-2 NDSI',
    vAxis: {title: 'NDSI', maxValue: 1, minValue: 0},
    hAxis: {title: 'date', format: 'MM-yy', gridlines: {count: 12}},
  });

print(NDSIChart);

//  --- Anual percent snow cover  ------------
var SnowpctChart = ui.Chart.image.seriesByRegion({
  imageCollection: selectNDSI.select('constant'), 
  regions: gl_shp,
  reducer: ee.Reducer.max(), 
  scale: 10, 
  seriesProperty: 'snow_%' 
})
  .setOptions({
    title: 'Anual percent snow cover',
    vAxis: {title: 'Percentage(%)', maxValue: 100, minValue: 0},
    hAxis: {title: 'date', format: 'dd-MM-yy', gridlines: {count: 12}},
  });

print(SnowpctChart);

//  --- SCATTER  ------------------------------------------------------------------------------------------

var values = ndsi_selected.sample({ region: gl_shp, scale: 10, numPixels: 1000, geometries: true});

var chart = ui.Chart.feature.byFeature(values,'NDSI',['B8scaled'])
  // .setSeriesNames('cluster')
  .setChartType('ScatterChart')
  .setOptions({ pointSize: 2, pointColor: 'red', width: 300, height: 300, titleX: 'NDSI', titleY: 'NIR' });
   
print(chart);


// --- EXPORT NDSI´s TO DRIVE ----------------------------------------------------------------------------------------------
// repo: https://github.com/fitoprincipe/geetools-code-editor
//Comment or uncoment (ctrl+ç) below code when necessary 

// var batch = require('users/fitoprincipe/geetools:batch');

// batch.Download.ImageCollection.toDrive(Ossue_S2_ndsi_2021, 'NDSIs')
