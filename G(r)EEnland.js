/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var ROI = 
    /* color: #d63000 */
    /* shown: false */
    /* displayProperties: [
      {
        "type": "rectangle"
      }
    ] */
    ee.Geometry.Polygon(
        [[[-54.4757245336202, 72.76165505108997],
          [-54.4757245336202, 72.57099172535499],
          [-53.52128727776083, 72.57099172535499],
          [-53.52128727776083, 72.76165505108997]]], null, false);
/***** End of imports. If edited, may not auto-convert in the playground. *****/
//______________________________________________________________________________________________________________________________
//    - FUNCTIONS - 
//_______________________________________________________________________________________________________________________________
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
// - Clip Image to Region Of Interest 
var clipROI = function(image) {
  var imgclipped = image.clip(ROI);
  return imgclipped;
};
// - NDSI Index Function
var addNDSI = function(image) {
  var ndsi = image.normalizedDifference(['B3', 'B11']).rename('NDSI');
  return image.addBands(ndsi);
};
// - Select Snow class in SCL (Scene Classification) mask to clip NDSI & B8 (NIR)
var NDSI_msk = function(image) {
  var fraction = image.select('SCL').eq(11);
  var ndsi_cut = image.select('NDSI').multiply(fraction)
  var ndsi_msk = ndsi_cut.updateMask(ndsi_cut.neq(0)).rename('NDSI_msk')
  var bands = image.select('B8').addBands(ndsi_msk) 
  return bands;
};
// - Rrs values  in GEE are multiplied by a scale factor of 10000.
var scaleNIR = function(image) {
  var NIRscaled = image.select('B8').divide(10000).rename('B8scaled');
  var bands = image.select('NDSI_msk').addBands(NIRscaled);
  return bands;
};
// - Create a Mask to Snow/Ice thresholding
var icesnowmask = function(image) {
  var maskbands = image.select(['NDSI_msk','B8scaled']);
  var thrsld = maskbands.select('NDSI_msk').gte(0.4).and(maskbands.select('B8scaled').gte(0.4)).eq(1).rename('mask');
  return image.select('NDSI_msk').addBands(thrsld);
};
//_______________________________________________________________________________________________________________________________
//    - VISUALIZATION PARAMETERS -
//_______________________________________________________________________________________________________________________________
var rgbprms = {bands:["B4","B3","B2"], gamma: 1, max: 8354.955450606461, min: -729.5198445458559, opacity: 1};
var ndsiViz = {bands:'NDSI_msk', min: 0, max: 1, palette: ['#800000','#0000FF','00FFFF','FF00FF']};
var maskViz = {bands : 'mask', min:0, max:1,palette: ['#2980B9','#D2B4DE']};
var sclParam = {"opacity":1,"bands":["SCL"],"min":1,"max":11,"palette":["000000","6a6a6a","595959","19e055","9b7a4c","0d00ff","000000","9cfcff","9cfcff","c5a2ff","d1fff8"]};
//_______________________________________________________________________________________________________________________________
//    - DEFINE COMMON PARAMETERS FOR RGB, S2 CLASSIFICATION, NDSI & SNOW/ICE MASK - 
//_______________________________________________________________________________________________________________________________
// - Define filter RGB parameters
var S2_Glacier_rgb_params  = ee.ImageCollection("COPERNICUS/S2_SR")
          .filterMetadata('MGRS_TILE', 'equals','21XWA')
          .filterBounds(ROI)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
          .map(maskS2clouds)
          .select('B2','B3','B4')
          .map(clipROI);
// - Define filter SCL parameters
var S2_Glacier_scl_params  = ee.ImageCollection("COPERNICUS/S2_SR")
          .filterMetadata('MGRS_TILE', 'equals','21XWA')
          .filterBounds(ROI)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
          .map(maskS2clouds)
          .select('SCL')
          .map(clipROI);
// - Define filter NDSI parameters
var S2_Glacier_ndsi_params  = ee.ImageCollection("COPERNICUS/S2_SR")
          .filterMetadata('MGRS_TILE', 'equals','21XWA')
          .filterBounds(ROI)
          .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 5))
          .map(maskS2clouds)
          .select('B3','B11','B8','SCL')
          .map(addNDSI)
          .select('NDSI','B8','SCL')
          .map(clipROI);
//_______________________________________________________________________________________________________________________________
//    - DEFINE DATES TO REMOVE (Incomplete secenes) - 
//_______________________________________________________________________________________________________________________________
var lst2rmv17 = (['','']);
var lst2rmv18 = (['']);
var lst2rmv19 = (['20190515T161901_20190515T161904_T21XWA']);
var lst2rmv20 = (['20200604T154819_20200604T155019_T21XWA','20200613T161829_20200613T161831_T21XWA','20200618T161911_20200618T161906_T21XWA',
                  '20200718T161911_20200718T161905_T21XWA']);
var lst2rmv21 = (['20210524T161901_20210524T161901_T21XWA','20210519T161829_20210519T161828_T21XWA','20210504T161901_20210504T161859_T21XWA',
                  '20210603T161901_20210603T161901_T21XWA','20210608T161829_20210608T161830_T21XWA','20210618T161829_20210618T161830_T21XWA',
                  '20210623T161901_20210623T161902_T21XWA','20210802T161901_20210802T161904_T21XWA']);
//_______________________________________________________________________________________________________________________________
//    - FILTER BY DATE AND APPLY FUNCTIONS - 
//_______________________________________________________________________________________________________________________________
// - Filter by date
// - 2018 ------------------------------------------------------------------------------------------------------------------------
var S2_Glacier_rgb_2018 = S2_Glacier_rgb_params.filterDate('2018-05-01', '2018-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv18).not());
var S2_Glacier_scl_2018 = S2_Glacier_scl_params.filterDate('2018-05-01', '2018-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv18).not());
var S2_Glacier_ndsi_2018 = S2_Glacier_ndsi_params.filterDate('2018-05-01', '2018-9-01')
                                                 .filter(ee.Filter.inList('system:index', lst2rmv18).not())
                                                 .map(NDSI_msk)
                                                 .map(scaleNIR)
                                                 .map(icesnowmask);
// print(S2_Glacier_rgb_2018,'RGB');
// print(S2_Glacier_scl_2018,'SCL');
// print(S2_Glacier_ndsi_2018,'NDSI & NIR');
// - 2019 ------------------------------------------------------------------------------------------------------------------------
var S2_Glacier_rgb_2019 = S2_Glacier_rgb_params.filterDate('2019-05-01', '2019-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv19).not());
var S2_Glacier_scl_2019 = S2_Glacier_scl_params.filterDate('2019-05-01', '2019-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv19).not());
var S2_Glacier_ndsi_2019 = S2_Glacier_ndsi_params.filterDate('2019-05-01', '2019-9-01')
                                                 .filter(ee.Filter.inList('system:index', lst2rmv19).not())
                                                 .map(NDSI_msk)
                                                 .map(scaleNIR)
                                                 .map(icesnowmask);
// print(S2_Glacier_rgb_2019,'RGB');
// print(S2_Glacier_scl_2019,'SCL');
// print(S2_Glacier_ndsi_2019,'NDSI & NIR');
// - 2020 ------------------------------------------------------------------------------------------------------------------------
var S2_Glacier_rgb_2020 = S2_Glacier_rgb_params.filterDate('2020-05-01', '2020-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv20).not());
var S2_Glacier_scl_2020 = S2_Glacier_scl_params.filterDate('2020-05-01', '2020-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv20).not());
var S2_Glacier_ndsi_2020 = S2_Glacier_ndsi_params.filterDate('2020-05-01', '2020-9-01')
                                                 .filter(ee.Filter.inList('system:index', lst2rmv20).not())
                                                 .map(NDSI_msk)
                                                 .map(scaleNIR)
                                                 .map(icesnowmask);
// print(S2_Glacier_rgb_2020,'RGB');
// print(S2_Glacier_scl_2020,'SCL');
// print(S2_Glacier_ndsi_2020,'NDSI & NIR');
// - 2021 ------------------------------------------------------------------------------------------------------------------------
var S2_Glacier_rgb_2021 = S2_Glacier_rgb_params.filterDate('2021-05-01', '2021-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv21).not());
var S2_Glacier_scl_2021 = S2_Glacier_scl_params.filterDate('2021-05-01', '2021-9-01')
                                               .filter(ee.Filter.inList('system:index', lst2rmv21).not());
var S2_Glacier_ndsi_2021 = S2_Glacier_ndsi_params.filterDate('2021-05-01', '2021-9-01')
                                                 .filter(ee.Filter.inList('system:index', lst2rmv21).not())
                                                 .map(NDSI_msk)
                                                 .map(scaleNIR)
                                                 .map(icesnowmask);
// print(S2_Glacier_rgb_2021,'RGB');
// print(S2_Glacier_scl_2021,'SCL');
// print(S2_Glacier_ndsi_2021,'NDSI & NIR');
//_______________________________________________________________________________________________________________________________
//    - IMAGE SELECTION - 
//_______________________________________________________________________________________________________________________________
// - Specify NDSI Index & RGB from ImageCollections in Console > ImageCollection COPERNICUS/S2_SR > features 
var selectlist = 2;
var selectRGB = S2_Glacier_rgb_2019;
var selectNDSI = S2_Glacier_ndsi_2019;
var selectSCL = S2_Glacier_scl_2019;
// - RGB image selected to see in Map Layout
var listOfImages = selectRGB.toList(selectRGB.size());
var rgb_selected = ee.Image(listOfImages.get(selectlist));
// -  NDSI Index selected to see in Map Layout
var listOfIndex = selectNDSI.toList(selectNDSI.size());
var ndsi_selected = ee.Image(listOfIndex.get(selectlist));
// -  SCL Index selected to see in Map Layout
var listOfSCL = selectSCL.toList(selectSCL.size());
var scl_selected = ee.Image(listOfSCL.get(selectlist));
print(selectSCL,'SCL');
print(scl_selected,'SCL Selected');
print(ndsi_selected,'Bands Selected');
//_______________________________________________________________________________________________________________________________
//    - MAP LAYOUT - 
//_______________________________________________________________________________________________________________________________
// - See NDSI, Snow/Ice mask, SCL & RGB selected
// print(scl_selected, 'Selected SceneClassification');
Map.addLayer(scl_selected,sclParam,'SCL_selected');
// print(rgb_selected, 'Selected Img Properties');
Map.addLayer(rgb_selected,rgbprms,'RGB_selected');
// print(ndsi_selected, 'Selected Index Properties');
Map.addLayer(ndsi_selected.select('mask'),maskViz,'Snow/Ice mask');
Map.addLayer(ndsi_selected.select('NDSI_msk'),ndsiViz,'NDSI_selected');
// ________________________________________________________________________________________________________________________________
//     - NDSI TIME SERIES CHART -
//_________________________________________________________________________________________________________________________________
//  --- Anual NDSI Mean  ------------
var NDSIChart = ui.Chart.image.seriesByRegion({
  imageCollection: selectNDSI, 
  regions: ROI,
  reducer: ee.Reducer.mean(), 
  scale: 10, 
  seriesProperty: 'NDSI' 
})
  .setOptions({
    title: 'Sentinel-2 NDSI',
    vAxis: {title: 'Mean NDSI', maxValue: 1, minValue: 0},
    hAxis: {title: 'date', format: 'MM-yy', gridlines: {count: 12}},
  });
print(NDSIChart);
//Export ROI as Shapefile
// // Export the FeatureCollection to a KML or SHP file.
// var feat = ee.FeatureCollection(ee.Feature(ROI));
// Export.table.toDrive({
//   collection: feat,
//   description:'ROI_North',
//   fileFormat: 'SHP'
// });
