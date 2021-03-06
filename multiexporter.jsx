
// MultiExporter.js
// Version 0.1
// Version 0.2 Adds PNG and EPS exports
// Version 0.3 Adds support for exporting at different resolutions
// Version 0.4 Adds support for SVG, changed EPS behaviour to minimise output filesize
// Version 0.5 Fixed cropping issues
// Version 2.0 Incorporates all of Tom Byrne's terrific additions
//
// Exports Illustrator artboards and/or layers as individual PNG or PDF files
// 
// Copyright 2011-13 Matthew Ericson and Tom Byrne
// Comments or suggestions to mericson@ericson.net

// ====================
// Mike Bell
// mbell@imobile3.com 
// ezuratechan@gmail.com 
//
// October 8th 2014 
// version 2.1?
// 
// Modified the script for the following use-case scenario: 
// Instead of renaming artboards/layers with + or -
// You can simply select which top layers are visible and only the 
// artboards with matching layer names that are visible will be exported.
// Useful when generating large numbers of assets from a single file.
// ====================


var docRef = app.activeDocument;	


// Format specific functionality
getPng8Options = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	var options = new ExportOptionsPNG8();
	options.antiAliasing = true;
	options.transparency = transparency; 
	options.artBoardClipping = true;
	options.horizontalScale = scaling;
	options.verticalScale = scaling;
	return options;
}
getPng24Options = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	var options = new ExportOptionsPNG24();
	options.antiAliasing = true;
	options.transparency = transparency; 
	options.artBoardClipping = true;
	options.horizontalScale = scaling;
	options.verticalScale = scaling;	
	return options;
}
getPdfOptions = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	var options = new PDFSaveOptions();
	options.compatibility = PDFCompatibility.ACROBAT5;
	options.generateThumbnails = true;
	options.preserveEditability = false;
	return options;
}
getJpgOptions = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	var options = new ExportOptionsJPEG();
	options.antiAliasing = true;
	options.artBoardClipping = true;
	options.horizontalScale = scaling;
	options.verticalScale = scaling;	
	return options;
}
getEpsOptions = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	var options = new EPSSaveOptions();
	options.embedLinkedFiles = embedImage;
	options.embedAllFonts = embedFont;
	options.includeDocumentThumbnails = true;
	options.saveMultipleArtboards = false;
	return options;
}
getSvgOptions = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	options = new ExportOptionsSVG();
	options.embedRasterImages = embedImage;
	options.saveMultipleArtboards = true;
	return options;
}
getFxg1Options = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	options = new FXGSaveOptions();
	options.version = FXGVersion.VERSION1PT0;
	return options;
}
getFxg2Options = function ( transparency, scaling, embedImage, embedFont, trimEdges ) {
	options = new FXGSaveOptions();
	options.version = FXGVersion.VERSION2PT0;
	return options;
}

// Format specific save functions
savePng8 = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.png' );
	doc.exportFile(destFile, ExportType.PNG8 , options);
}
savePng24 = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.png' );
	doc.exportFile(destFile, ExportType.PNG24 , options);
}
savePdf = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.pdf' );   
	options.artboardRange = (artboardIndex+1).toString();
	doc.saveAs( destFile, options, artboardIndex, artboardName )
}
saveJpg = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.jpg' );
	doc.exportFile(destFile, ExportType.JPEG , options);
}
saveEps = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.eps' );
	options.artboardRange = (artboardIndex+1).toString();
	doc.saveAs( destFile, options, artboardIndex, artboardName )			
}
saveSvg = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.svg' );
	doc.exportFile(destFile, ExportType.SVG , options);
}
saveFxg = function ( doc, filePath, options, artboardIndex, artboardName ) {
	var destFile = new File( filePath + '.fxg' );
	options.artboardRange = (artboardIndex+1).toString();
	doc.saveAs( destFile, options, artboardIndex, artboardName )	
}




var multi_exporter = {

	PREFS_LAYER_NAME: "nyt_exporter_info",
	
	multiExporterPrefs:   null,
	
	prefix:		 '',
	suffix:		 '',
	base_path:	  '~/Desktop',
	transparency:   false,
	embedImage:   true,
	embedFont:   true,
	trimEdges:   true,
	ignoreWarnings:   false,
	
	format:		 "PNG 24",
	artboards:	null,
	layers:	null,
	
	dlg:			null,
	prefs_xml:	  null,

	currentFormatInfo: null,
	
	num_to_export:  0,
	
	failed_artboards:  null,
	failed_layers:  null,

	export_artboards: null, 
	export_layers: null, 
	whole_artboard_mode: false, 
  

	formatList:null,
	artboardList:null,
	progLabel:null,

	// these are controls that are format dependant
	controlNames:["scalingInput","transCheckBox","embedImageCheckBox","embedFontCheckBox","trimEdgesCheckBox","skipDefaultNames"],
	scalingInput:null,
	transCheckBox:null,
	embedImageCheckBox:null,
	embedFontCheckBox:null,
	trimEdgesCheckBox:null,
	ignoreCheckBox:null,
	exportArtboardsCheckBox:null,
    skipDefaultNames:null,


	// copyBehaviour - for vector outputs the output must be done from a copy of the document (to avoid hidden layers being included in output)
	formatInfo: [   {name:"PNG 8", copyBehaviour:false, getOptions:getPng8Options, saveFile:savePng8, activeControls:["scalingInput","transCheckBox","trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"PNG 24", copyBehaviour:false, getOptions:getPng24Options, saveFile:savePng24, activeControls:["scalingInput","transCheckBox","trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"PDF", copyBehaviour:false, getOptions:getPdfOptions, saveFile:savePdf, activeControls:["trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"JPG", copyBehaviour:false, getOptions:getJpgOptions, saveFile:saveJpg, activeControls:["scalingInput","trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"EPS", copyBehaviour:true, getOptions:getEpsOptions, saveFile:saveEps, activeControls:["embedImageCheckBox","embedFontCheckBox","trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"SVG", copyBehaviour:true, getOptions:getSvgOptions, saveFile:saveSvg, activeControls:["embedImageCheckBox","trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"FXG 1.0", copyBehaviour:true, getOptions:getFxg1Options, saveFile:saveFxg, activeControls:["trimEdgesCheckBox","skipDefaultNamesCheckBox"]},
					{name:"FXG 2.0", copyBehaviour:true, getOptions:getFxg2Options, saveFile:saveFxg, activeControls:["trimEdgesCheckBox","skipDefaultNamesCheckBox"]}],

	artboardSelect: [   {code:"all", name:'All artboards (except those beginning with - )'},
						{code:"current", name:'Current artboard'},
						{name:'---'} ],

	layerSelect: [  {code:"all", name:'All layers as individudal images (except those beginning with - )'},
					{code:"none", name:'All visible layers as 1 combined image'},
					{code:"selected", name:'Selected items\' layers'},
					{name:'---'} ],

	init: function() {
		
		var parse_success = this.load_prefs();	
		
		if (parse_success) {
			this.show_dialog();
		}
	},

	findExportTypeByCode: function(code){
		for(var i=0; i<this.exportTypes.length; ++i){
			var type = this.exportTypes[i];
			if(type.code==code)return type;
		}
	},
	
	load_prefs: function() {
	
		var parse_success = false;
		
		// find existing layers or add new one
		try {
			this.multiExporterPrefs = docRef.layers.getByName( this.PREFS_LAYER_NAME );

		} catch ( e ) {
			
			this.multiExporterPrefs = docRef.layers.add();
			this.multiExporterPrefs.name = this.PREFS_LAYER_NAME;
			
			var nyt_exporter_info_xml = this.multiExporterPrefs.textFrames.add();
			
			var saved_data = new XML( '<nyt_prefs></nyt_prefs>' );
			saved_data.appendChild( new XML('<nyt_prefix></nyt_prefix>') );
			saved_data.appendChild( new XML('<nyt_suffix></nyt_suffix>') );
			saved_data.appendChild( new XML('<nyt_base_path>~/Desktop</nyt_base_path>') );
			saved_data.appendChild( new XML('<nyt_scaling>100%</nyt_scaling>') );
			saved_data.appendChild( new XML('<nyt_transparency>true</nyt_transparency>') );
			saved_data.appendChild( new XML('<nyt_embedImage>true</nyt_embedImage>') );
			saved_data.appendChild( new XML('<nyt_embedFont>true</nyt_embedFont>') );
			saved_data.appendChild( new XML('<nyt_trimEdges>true</nyt_trimEdges>') );
             saved_data.appendChild( new XML('<nyt_skipDefaultNames>true</nyt_skipDefaultNames>') );

			saved_data.appendChild( new XML('<nyt_format>PNG 24</nyt_format>') );
			saved_data.appendChild( new XML('<nyt_artboards>all</nyt_artboards>') );
			saved_data.appendChild( new XML('<nyt_layers>all</nyt_layers>') );
			saved_data.appendChild( new XML('<nyt_exportArtboards>false</nyt_exportArtboards>') );
			saved_data.appendChild( new XML('<nyt_ignoreWarnings>false</nyt_ignoreWarnings>') );
			
			nyt_exporter_info_xml.contents = saved_data.toXMLString();	
			
			this.multiExporterPrefs.printable = false;
			this.multiExporterPrefs.visible = false;
		}
		
		
		// get xml out of the 1 text item on that layer and parse it
		if ( this.multiExporterPrefs.textFrames.length != 1 ) {
			Window.alert( 'Please delete the '+this.PREFS_LAYER_NAME+' layer and try again.' );
			
		} else {	 
			
			try {
				this.prefs_xml		  = new XML( this.multiExporterPrefs.textFrames[0].contents );
				this.prefix			 = this.prefs_xml.nyt_prefix;
				this.suffix			 = this.prefs_xml.nyt_suffix;
				this.base_path		  = this.prefs_xml.nyt_base_path;
				this.scaling 		= this.prefs_xml.nyt_scaling;
				this.transparency	   = this.prefs_xml.nyt_transparency == "true" ? true : false;
				this.embedImage	   = this.prefs_xml.nyt_embedImage == "true" ? true : false;
				this.ignoreWarnings	   = this.prefs_xml.nyt_ignoreWarnings == "true" ? true : false;
				this.embedFont	    = this.prefs_xml.nyt_embedFont == "true" ? true : false;
				this.trimEdges	    = this.prefs_xml.nyt_trimEdges == "true" ? true : false;
             	this.skipDefaultNames = this.prefs_xml.nyt_skipDefaultNames == "true" ? true : false;

				this.format			 = this.prefs_xml.nyt_format;
				this.artboards		= this.prefs_xml.nyt_artboards.toString();
				this.layers		= this.prefs_xml.nyt_layers.toString();

				if(!this.artboards){
					this.artboards = this.artboardSelect[0].code;
				}else if(parseInt(this.artboards).toString()==this.artboards){
					this.artboards = parseInt(this.artboards);
				}
				if(!this.layers){
					this.layers = this.layerSelect[0].code;
				}else if(parseInt(this.layers).toString()==this.layers){
					this.layers = parseInt(this.layers);
				}
				
				if ( ! this.prefs_xml.nyt_scaling || this.prefs_xml.nyt_scaling == '' ) {
				   this.scaling = '100%';
				} 
				parse_success = true;
			
			} catch ( e ) {
				Window.alert( 'Please delete the this.multiExporterPrefs layer and try again.' );
			}
			
		}
		
		return parse_success;
	},

	
	// dialog display
	show_dialog: function() {
		
		// Export dialog
		this.dlg = new Window('dialog', 'Multi Exporter');
		
		var row;

		// ARTBOARD TYPE ROW
		
		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		var typeSt = row.add('statictext', undefined, 'Export artboards:'); 
		typeSt.size = [ 100,20 ];	
		
		var artboardNames = [];
		for(var i=0; i<this.artboardSelect.length; ++i){
			artboardNames.push(this.artboardSelect[i].name)
		}
		for(var i=0; i<docRef.artboards.length; i++){
			var artboard = docRef.artboards[i];
			artboardNames.push((i+1)+": "+artboard.name);
		}

		this.artboardList = row.add('dropdownlist', undefined, artboardNames);
		this.artboardList.selection = this.findDataIndex(this.artboards, this.artboardSelect);
		

		// LAYER TYPE ROW
		
		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		var typeSt = row.add('statictext', undefined, 'Export layers:'); 
		typeSt.size = [ 100,20 ];	
		
		var layerNames = [];
		for(var i=0; i<this.layerSelect.length; ++i){
			layerNames.push(this.layerSelect[i].name)
		}
		for(var i=0; i<docRef.layers.length; i++){
			var layer = docRef.layers[i];
			layerNames.push((i+1)+": "+layer.name);
		}

		this.layerList = row.add('dropdownlist', undefined, layerNames);
		this.layerList.selection = this.findDataIndex(this.layers, this.layerSelect);

		// PREFIX GRP
		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		var prefixSt = row.add('statictext', undefined, 'File prefix:'); 
		prefixSt.size = [100,20]

		this.prefixEt = row.add('edittext', undefined, this.prefix); 
		this.prefixEt.size = [ 300,20 ];

		// suffix row
		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		var suffixSt = row.add('statictext', undefined, 'File suffix:'); 
		suffixSt.size = [100,20]

		this.suffixEt = row.add('edittext', undefined, this.suffix); 
		this.suffixEt.size = [ 300,20 ];

		// scaling row
		row = this.dlg.add('group', undefined, '')
		row.oreintation = 'row';
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]

		var scalingLabel = row.add('statictext', undefined, 'Scaling:'); 
		scalingLabel.size = [100,20]

		this.scalingInput = row.add('edittext', undefined, this.scaling); 
		this.scalingInput.size = [ 100,20 ];

		var scalingTip = row.add('statictext', undefined, '(Normally 100%; Use 200% for Retina display exports)'); 
		scalingTip.size = [300,20]

		// DIR GROUP
		row = this.dlg.add( 'group', undefined, '') 
		row.orientation = 'row'
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
		
		var dirSt = row.add('statictext', undefined, 'Output directory:'); 
		dirSt.size = [ 100,20 ];

		this.dirEt = row.add('edittext', undefined, this.base_path); 
		this.dirEt.size = [ 300,20 ];

		var chooseBtn = row.add('button', undefined, 'Choose ...' );
		chooseBtn.onClick = function() { multi_exporter.dirEt.text = Folder.selectDialog(); }

		// FORMAT ROW
		row = this.dlg.add('group', undefined, ''); 
		row.orientation = 'row'
		row.alignment = [ScriptUI.Alignment.LEFT, ScriptUI.Alignment.TOP]
		
		var formatSt = row.add('statictext', undefined, 'Export format:'); 
		formatSt.size = [ 100,20 ];	
		
		var formatNames = [];
		for(var i=0; i<this.formatInfo.length; ++i){
			formatNames.push(this.formatInfo[i].name)
		}
		this.formatList = row.add('dropdownlist', undefined, formatNames);
		
		this.formatList.selection = 1;
		for ( var i=0; i < this.formatList.items.length; i++ ) {
			if ( multi_exporter.format == this.formatList.items[i].text ) {
				this.formatList.selection = i;
			}
		}
		
		this.embedImageCheckBox = row.add('checkbox', undefined, 'Embed Imagery');
		this.embedImageCheckBox.value = this.embedImage;
		
		this.embedFontCheckBox = row.add('checkbox', undefined, 'Embed Fonts');
		this.embedFontCheckBox.value = this.embedFont;

		// TRANSPARENCY AND TRIM ROW
		row = this.dlg.add('group', undefined, ''); 
		row.orientation = 'row'
		row.alignment = [ScriptUI.Alignment.CENTER, ScriptUI.Alignment.TOP]
		
		this.transCheckBox = row.add('checkbox', undefined, 'Transparency');
		this.transCheckBox.value = this.transparency;
		
		this.trimEdgesCheckBox = row.add('checkbox', undefined, 'Trim Edges');
		this.trimEdgesCheckBox.value = this.trimEdges;

		this.skipDefaultNamesCheckBox = row.add('checkbox', undefined, 'Skip Default Names');
		this.skipDefaultNamesCheckBox.value = this.skipDefaultNames;

		// progress bar
		var progBar = this.dlg.add( 'progressbar', undefined, 0, 100 );
		progBar.size = [400,10]

		this.progLabel = this.dlg.add('statictext', undefined, '...' ); 
		this.progLabel.size = [ 400,20 ];

		// buttons row
		row = this.dlg.add('group', undefined, ''); 
		row.orientation = 'row'

		var cancelBtn = row.add('button', undefined, 'Cancel', {name:'cancel'});
		cancelBtn.onClick = function() { multi_exporter.dlg.close() };

		var saveBtn = row.add('button', undefined, 'Save and Close', {name:'saveClose'});
		saveBtn.onClick = function() {
			multi_exporter.saveOptions();
			multi_exporter.dlg.close()
		};

		// OK button
		var okBtn = row.add('button', undefined, 'Export', {name:'ok'});
		okBtn.onClick = function() { 
			
			multi_exporter.saveOptions(); // save options before export in case of errors

			try{
				multi_exporter.run_export(); 
			}catch(e){
				alert("Exception caught: " + e);
			}
		};
		
		this.ignoreCheckBox = row.add('checkbox', undefined, 'Ignore Warnings');
		this.ignoreCheckBox.value = this.ignoreWarnings;
		
		// Export type handler
		this.artboardList.onChange = function() {
			multi_exporter.artboards  = multi_exporter.getListData(multi_exporter.artboardList.selection.index, multi_exporter.artboardSelect);
			multi_exporter.update_export_desc(  );
		};
		this.layerList.onChange = function() {
			multi_exporter.layers  = multi_exporter.getListData(multi_exporter.layerList.selection.index, multi_exporter.layerSelect);
			multi_exporter.update_export_desc( );
		};
		this.skipDefaultNamesCheckBox.onClick = function() {

                      multi_exporter.skipDefaultNames = this.value;          


			multi_exporter.layers  = multi_exporter.getListData(multi_exporter.layerList.selection.index, multi_exporter.layerSelect);
			multi_exporter.update_export_desc( );
		};

		// Format change handler
		this.formatList.onChange = function() {
			multi_exporter.checkFormat();
		};

		multi_exporter.update_export_desc( );
		
		this.dlg.progBar = progBar;
		
		this.checkFormat();
		this.dlg.show();
	},

	findDataIndex: function(data, selectList){
		if(typeof(data)=="string" && parseInt(data).toString()==data){
			data = parseInt(data);
		}
		if(typeof(data)=="number"){
			return selectList.length+data;
		}else{
			for(var i=0; i<selectList.length; ++i){
				if(selectList[i].code==data){
					return i;
				}
			}
		}
		alert("no find: "+data);
	},

	getListData: function(index, selectList){
		if(index>=selectList.length){
			return index-selectList.length;
		}else{
			return selectList[index].code;
		}
	},

	checkFormat: function ( progLabel ) {
		var formatInfo = this.formatInfo[this.formatList.selection.index];
		this.currentFormatInfo = formatInfo;

		for(var i=0; i<this.controlNames.length; i++){
			var controlName = this.controlNames[i];
			this[controlName].enabled = (this.indexOf(formatInfo.activeControls, controlName)!=-1);
		}
	},

	indexOf: function ( array, element ) {
		for(var i=0; i<array.length; i++){
			if(array[i]==element)return i;
		}
		return -1;
	},
	
	update_export_desc: function () {

		this.export_artboards = []; 
		this.export_layers = [];

        this.whole_artboard_mode = false;
		
		if(this.artboards=="all") {

			//alert("total artboards: " + docRef.artboards.length);
			//alert("total layers: " + docRef.layers.length);

			for(var i=0; i<docRef.artboards.length; i++) {

				var artboard = docRef.artboards[i];

				// check to see if there exists a layer that shares this artboard's name and that layer is visible 
				
                for (var j=0; j<docRef.layers.length; j++) {
                    
                    var layer = docRef.layers[j];
                    
                    if (artboard.name === layer.name && this.isIncludeLayer(layer)) {
                 
                        this.export_artboards.push(i);
                        break;
                    
                    }
				}
			}
		}else if(this.artboards=="current"){
			this.export_artboards.push(docRef.artboards.getActiveArtboardIndex());
		}else if(typeof(this.artboards)=="number"){
			this.export_artboards.push(this.artboards);
		}
		
		
		//alert("this.export_artboards: " + this.export_artboards);
		
		
		if(this.layers=="all"){
			for(var i=0; i<docRef.layers.length; ++i){
				var layer = docRef.layers[i];
				if(!this.isAdditionalLayer(layer) && this.isIncludeLayer(layer)){
					this.export_layers.push(i);
				}
			}
		}else if(this.layers=="selected"){
			for(var i=0; i<docRef.layers.length; ++i){
				var layer = docRef.layers[i];
				if(!this.isAdditionalLayer(layer) && this.isIncludeLayer(layer) && layer.hasSelectedArtwork){
					this.export_layers.push(i);
				}
			}
			this.export_layers.push(docRef.artboards.getActiveArtboardIndex());
         } else if ( this.layers=="none" ) {
                this.whole_artboard_mode = true;
             
		}else if(typeof(this.layers)=="number"){
			this.export_layers.push(this.layers);
		}
		this.updateExportCounts();
	},
	updateExportCounts: function(){
        
		this.num_to_export = this.export_artboards.length*this.export_layers.length;


         var artboardExportTxt;
		if(this.whole_artboard_mode){
			this.num_to_export += this.export_artboards.length;
			if(this.export_layers.length){
				artboardExportTxt = " (and "+this.export_artboards.length+" artboard images)";
			}else{
				this.progLabel.text = 'Will export ' + this.export_artboards.length + ' of ' + docRef.artboards.length + ' artboards';
				return;
			}
		}else{
			artboardExportTxt = "";
		}

		if(this.export_artboards.length>1 && this.export_layers.length>1){
			this.progLabel.text = 'Will export ' + this.num_to_export + ' files (' + this.export_layers.length + ' layers * ' + this.export_artboards.length + ' artboards)'+artboardExportTxt;

		}else if(this.export_layers.length>0 && this.export_artboards.length==1){
			var artboard = docRef.artboards[this.export_artboards[0]];
			this.progLabel.text = 'Will export ' + this.export_layers.length + ' of ' + docRef.layers.length+ ' layers on artboard "' + artboard.name +'"' +artboardExportTxt;

		}else if(this.export_layers.length>0 && this.export_artboards.length>0){
			var artboard = docRef.artboards[this.export_artboards[0]];
			this.progLabel.text = 'Will export ' + this.export_layers.length+' layers on "' + this.export_artboards.length +'" artboards' +artboardExportTxt;
		}else{
			this.progLabel.text = 'Please select valid artboards / layers' ;

		}

	},

	saveOptions:function(){
		this.prefix	   = this.prefixEt.text; 
		this.suffix	   = this.suffixEt.text; 
		this.base_path	= this.dirEt.text;
		this.transparency = this.transCheckBox.value;
		this.embedImage = this.embedImageCheckBox.value; 
		this.embedFont = this.embedFontCheckBox.value;
		this.trimEdges = this.trimEdgesCheckBox.value;
         this.skipDefaultNames = this.skipDefaultNamesCheckBox.value;

		this.ignoreWarnings = this.ignoreCheckBox.value;
		this.format	   = this.formatList.selection.text;
		this.scaling	  = parseFloat( this.scalingInput.text.replace( /\% /, '' ));

		this.prefs_xml.nyt_base_path	= this.base_path;
		this.prefs_xml.nyt_scaling	  = this.scaling;
		this.prefs_xml.nyt_prefix	   = this.prefix;
		this.prefs_xml.nyt_suffix	   = this.suffix;
		this.prefs_xml.nyt_transparency = this.transparency;
		this.prefs_xml.nyt_embedImage = this.embedImage;
		this.prefs_xml.nyt_ignoreWarnings = this.ignoreWarnings;
		this.prefs_xml.nyt_embedFont = this.embedFont;
		this.prefs_xml.nyt_trimEdges = this.trimEdges;
         this.prefs_xml.nyt_skipDefaultNames = this.skipDefaultNames;

		this.prefs_xml.nyt_format	   = this.format;
		this.prefs_xml.nyt_artboards  = this.artboards;
		this.prefs_xml.nyt_layers  = this.layers;
		this.prefs_xml.nyt_exportArtboards  = this.whole_artboard_mode;
		
		this.multiExporterPrefs.textFrames[0].contents = this.prefs_xml.toXMLString();
	},

	
	// run_export function. does the dirty work
	run_export: function() {
		//alert("begin run_export");
	
		this.failed_artboards = [];
		this.failed_layers = [];
		var formatInfo = this.currentFormatInfo;

		var copyBehaviour = formatInfo.copyBehaviour || this.trimEdges;

		var num_exported = 0;
		var options = formatInfo.getOptions(this.transparency, this.scaling, this.embedImage, this.embedFont, this.trimEdges);

		if(!copyBehaviour){
			var were_shown = this.get_shown_layers();
		}
		
		//alert("were_shown = " + were_shown);
		//alert("export_artboards: " + this.export_artboards);

		if(!this.export_artboards.length || (!this.export_layers.length && !this.whole_artboard_mode)){
			alert('Please select valid artboards / layers');
			return;
		}

		if(!this.base_path){
			alert('Please select select a destination');
			return;
		}

		// offsetting must be in relation to the center of the first artboard
		
		var firstRect = docRef.artboards[0].artboardRect;
		//var firstRect = docRef.artboards[this.export_artboards[0]];
		var firstCentX = (firstRect[2]-firstRect[0])/2;
		var firstCentY = (firstRect[1]-firstRect[3])/2;
		
		for (var i = 0; i < this.export_artboards.length; i++ ) {
			
			var actualIndex = this.export_artboards[i];
			var artboard = docRef.artboards[actualIndex];
			var artboardName = artboard.name;
			
			//alert("Entering artboard loop..." + artboardName);

			var rect = artboard.artboardRect;

			var offsetX = firstRect[0]-rect[0];
			var offsetY = firstRect[1]-rect[1];

			var artW = rect[2]-rect[0];
			var artH = rect[1]-rect[3];

			var copyDoc;

			// if exporting artboard by artboard, export layers as is
			if ( this.whole_artboard_mode) {
								
				try{
					var base_filename = this.base_path + "/" + this.prefix + artboardName + this.suffix;
					
					if(copyBehaviour){
										
						var offset = {x:offsetX, y:offsetY};
						copyDoc = this.copyDocument(docRef, artboard, rect, artW, artH, offset, function(layer){return (layer.name!=multi_exporter.PREFS_LAYER_NAME && layer.visible)});
						
						formatInfo.saveFile(copyDoc, base_filename, options, i, artboardName);

						copyDoc.close(SaveOptions.DONOTSAVECHANGES);
						copyDoc = null;
					}
					else{
						//alert("saving " + base_filename + "...");
					
                        $.writeln(base_filename);
						formatInfo.saveFile(docRef, base_filename, options, actualIndex, artboardName);
					}
				}catch(e){
					this.failed_artboards.push(i);
				}
				
				this.updateProgress(num_exported++);			
			}
			
			
			if(this.export_layers.length){
					
				//alert("this.export_layers.length");
				if(copyBehaviour){

					if(!this.trimEdges){
						var layerDepths = [];
						var offset = {x:offsetX, y:offsetY};
						copyDoc = this.copyDocument(docRef, artboard, rect, docRef.width, docRef.height, offset, this.isAdditionalLayer, layerDepths);
						var hasAdditLayers = copyDoc.layers.length>0;
					}
				}else{
					this.hide_all_layers();
				}
				
				for ( var j=0; j < this.export_layers.length; j++ ) {
					//alert("entering layer loop..." + j);
				
					var layer = docRef.layers[this.export_layers[j]];
					var lyr_name = layer.name;

					try{
						var layerRect
						// only process layer if it has bounds (i.e. not guide layer) and falls within current artboard bounds
						layerRect = this.get_layer_bounds(layer)
						if(layerRect==null)continue;

						if (layerRect[0]<layerRect[2] && layerRect[1]>layerRect[3]) {
							var isVis = this.intersects(rect, layerRect);

							if(!hasAdditLayers && !isVis && !this.trimEdges){
								// skip layers where nothing is visible
								// continue;
							}
							var base_filename;
							if ( this.export_artboards.length==1 ) {
								base_filename = this.base_path + "/" + this.prefix + lyr_name + this.suffix;
							} else{
								base_filename = this.base_path + "/" + this.prefix + artboardName + '-' + lyr_name + this.suffix;
							}
							if(copyBehaviour){

								if(this.trimEdges){
									if(copyDoc){
										copyDoc.close(SaveOptions.DONOTSAVECHANGES);
										copyDoc = null;
									}

									// crop to artboard
									if(layerRect[0]<rect[0]){
										layerRect[0] = rect[0];
									}else{
										intendedX = 0;
									}
									if(layerRect[1]>rect[1]){
										layerRect[1] = rect[1];
									}
									if(layerRect[2]>rect[2]){
										layerRect[2] = rect[2];
									}
									if(layerRect[3]<rect[3]){
										layerRect[3] = rect[3];
									}else{
										intendedY = 0;
									}
									layerOffsetY = rect[3] - layerRect[3];
									layerOffsetX = rect[0] - layerRect[0];

									docW = layerRect[2]-layerRect[0];
									docH = layerRect[1]-layerRect[3];

									offset = {x:offsetX+layerOffsetX, y:offsetY+layerOffsetY};
									var layerDepths = [];
									var copyDoc = this.copyDocument(docRef, artboard, rect, docW, docH, offset, this.isAdditionalLayer, layerDepths);
								
									var hasAdditLayers = copyDoc.layers.length>1; // there will be one empty layer in the new file (which can be ignored)

									if(!hasAdditLayers && !isVis){
										// skip layers where nothing is visible
										continue;
									}
								}
								if(isVis){
									// only copy layer if it is visible (if not only visible '+' layers will be output)
									var new_layer = this.copy_layer(layer, copyDoc.layers.add(), offset);
									new_layer.visible = true;
									var depth = layerDepths[this.export_layers[j]];
									while(new_layer.zOrderPosition<depth){
										new_layer.zOrder(ZOrderMethod.BRINGFORWARD);
									}
									while(new_layer.zOrderPosition>depth){
										new_layer.zOrder(ZOrderMethod.SENDBACKWARD);
									}
								}
								formatInfo.saveFile(copyDoc, base_filename, options, i, artboardName);
								if(new_layer && !this.trimEdges){
									new_layer.remove();
									new_layer = null;
								}
							}else{
								layer.visible = true;
								formatInfo.saveFile(docRef, base_filename, options, i, artboardName);
								layer.visible = false;
							}
						}
					}catch(e){
						this.failed_artboards.push(i);
						this.failed_layers.push(j);
						if(new_layer && !this.trimEdges){
							new_layer.remove();
							new_layer = null;
						}
					}
					this.updateProgress(++num_exported);
				}
				//alert("exited layer loop");
				
				if(copyDoc){
					copyDoc.close(SaveOptions.DONOTSAVECHANGES);
					copyDoc = null;
				}
			}
			
		}
		//alert("exited artboard loop");
		
		if(!copyBehaviour){
			this.show_layers(were_shown);
		}
		if((!this.failed_layers.length && !this.failed_artboards.length) || !this.redoFailed(this.failed_layers, this.failed_artboards)){
			this.dlg.close();
		}
		
		//alert("end run_export");

	},
	
	redoFailed: function(failed_layers, failed_artboards) {
		var newLayers = [];
		for(var i=0; i<failed_layers.length; ++i){
			var index = this.export_layers[failed_layers[i]];
			if(this.indexOf(newLayers, index)==-1)newLayers.push(index);
		}
		var newArtboards = [];
		for(var i=0; i<failed_artboards.length; ++i){
			var index = this.export_artboards[failed_artboards[i]];
			if(this.indexOf(newArtboards, index)==-1)newArtboards.push(index);
		}
		if(newLayers.length){
			var layerNames = "";
			for(var i=0; i<newLayers.length; ++i){
				var index = newLayers[i];
				layerNames += "\n - "+docRef.layers[index].name;
			}
			var msg = newLayers.length+" layers failed across "+newArtboards.length+" artboards:"+layerNames+"\n Retry?";
		}else{
			var artboardNames = "";
			for(var i=0; i<newArtboards.length; ++i){
				var index = newArtboards[i];
				artboardNames += "\n - "+docRef.artboards[index].name;
			}
			var msg = newArtboards.length+" artboards failed:"+artboardNames+"\nRetry?";
		}
		if(confirm(msg)){
			this.export_artboards = newArtboards;
			this.export_layers = newLayers;
			this.updateExportCounts();
			this.run_export();
			return true;
		}
		return false;
	},
	
	traceRect: function(rect) {
		if(!rect)return "no rect";
		return "l: "+Math.round(rect[0])+" t: "+Math.round(rect[1])+" r: "+Math.round(rect[2])+" b: "+Math.round(rect[3])+" w: "+(rect[2]-rect[0])+" h: "+(rect[1]-rect[3]);
	},
	
	isAdditionalLayer: function(layer) {
		return ( layer.name.match( /^\+/ ) && layer.visible);
	},

    isIncludeArtboard: function(artboard) {
        
        return( true );
         
        /*
        if ( this.skipDefaultNames ) {
            return ( !artboard.name.match( /^\-/) && !artboard.name.match( /^Artboard \d+/ ) );
         } else { 
            return ( !artboard.name.match( /^\-/) );
         }
         */
    },
	
	isIncludeLayer: function(layer) {
        
        /*
        if ( this.skipDefaultNames ) {
            return ( !layer.name.match( /^\+/ ) && layer.name!=this.PREFS_LAYER_NAME && !layer.name.match( /^\-/) && !layer.name.match( /^Layer \d+/ ) );
         } else { 
            return ( !layer.name.match( /^\+/ ) && layer.name!=this.PREFS_LAYER_NAME && !layer.name.match( /^\-/) );
         }
         */
        return layer.visible;
	},
	
	copyDocument: function(docRef, artboard, rect, w, h, offset, layerCheck, layerDepths) {
	
		alert("begin copyDocument");
	
		var preset = new DocumentPreset();
		preset.width = w;
		preset.height = h;
		preset.colorMode = docRef.documentColorSpace;
		preset.units = docRef.rulerUnits;

		var copyDoc = app.documents.addDocument(docRef.documentColorSpace, preset);
		copyDoc.pageOrigin = docRef.pageOrigin;
		copyDoc.rulerOrigin = docRef.rulerOrigin;
		var count = 1; // indices are 1 based!
		var n = docRef.layers.length;
		for ( var j=docRef.layers.length-1; j >=0; j-- ) {
			
			layer = docRef.layers[j];
			
			if (layerCheck(layer)) {
				var layerBounds = this.get_layer_bounds(layer);
				if(layerBounds && this.intersects(rect, layerBounds)){
					this.copy_layer(layer, copyDoc.layers.add(), offset);
					++count;
				}
			}else if(layerDepths){
				layerDepths[j] = count;
			}
		}
		
		alert("end copyDocument");
		
		return copyDoc;
	},

	updateProgress: function(num_exported) {
		this.progLabel.text = 'Exported ' + num_exported + ' of ' + this.num_to_export;
		this.dlg.progBar.value = num_exported / this.num_to_export * 100;
		this.dlg.update();
	},
	
	copy_layer: function(from_layer, to_layer, offset) {
	
		alert("begin copy_layer");
	
		to_layer.artworkKnockout = from_layer.artworkKnockout;
		to_layer.blendingMode = from_layer.blendingMode;
		to_layer.color = from_layer.color;
		to_layer.dimPlacedImages = from_layer.dimPlacedImages;
		to_layer.isIsolated = from_layer.isIsolated;
		to_layer.name = from_layer.name;
		to_layer.opacity = from_layer.opacity;
		to_layer.preview = from_layer.preview;
		to_layer.printable = from_layer.printable;
		to_layer.sliced = from_layer.sliced;
		to_layer.typename = from_layer.typename;

		if(!offset.norm){
			var oldBounds = this.get_layer_bounds(from_layer);
			 //for mystery reasons, this only works if done before copying items across
		}

		var items = from_layer.pageItems;
		try{
			this.copy_items(items, to_layer);
		}catch(e){
			alert("copy items failed");
		}

		// copy backwards for correct z-ordering
		for(var i=from_layer.layers.length-1; i>=0; --i) {
			var child = from_layer.layers[i];
			if(child.visible) {
                this.copy_layer(child, to_layer.layers.add(), offset)
            }
		}

		if (!offset.norm){

			var newBounds = this.get_layer_bounds(to_layer);

			if (this.rect_equal(oldBounds, newBounds)) {

				//if (!this.ignoreWarnings) {
                    //alert("Illustrator visibleBounds issue workaround.\nTry removing groups on layer '"+from_layer.name+"' to avoid this in future.\nPlease press OK");
                    //alert("oldBounds = " + oldBounds + "\n newBounds = " + newBounds);
                //}
                //alert("Continuing script...");

				newBounds = this.get_layer_bounds(to_layer);
				// sometimes it takes a moment for bounds to be updated
                //alert("oldBounds = " + oldBounds + "\n newBounds = " + newBounds);
			}

			if(oldBounds && newBounds){
				offset.x += oldBounds[0]-newBounds[0];
				offset.y += oldBounds[3]-newBounds[3];
				offset.norm = true;
				
				//alert("offset: (" + offset.x + ", " + offset.y + ")");
			}
		}
		if(to_layer.parent.artboards!=null){ // only if top level layer
			try{
				this.shift_layer(to_layer, offset.x, offset.y);
			}catch(e){
				//alert("shift layer failed");
			}
		}
		//alert("end copy_layer");

		return to_layer;
	},
	
	rect_equal: function(rect1, rect2) {
		return rect1[0]==rect2[0] && rect1[1]==rect2[1] && rect1[2]==rect2[2] && rect1[3]==rect2[3] ;
	},
	
	copy_items: function(from_list, to_layer) {

		var visWas = to_layer.visible;
		to_layer.visible = true;
		for(var i=0; i<from_list.length; ++i){
			var item = from_list[i].duplicate(to_layer, ElementPlacement.PLACEATEND);
			/*if(shiftX!=0 || shiftY!=0){
				item.translate(shiftX, shiftY)
			}*/
		}
		to_layer.visible = visWas;
	},
	
	shift_layer: function(layer, shiftX, shiftY) {
		this.shift_items(layer.pageItems, shiftX, shiftY);

		// copy backwards for correct z-ordering
		for(var i=layer.layers.length-1; i>=0; --i){
			this.shift_layer(layer.layers[i], shiftX, shiftY)
		}
	},
	
	shift_items: function(items, shiftX, shiftY) {
		if(shiftX==undefined)shiftX = 0;
		if(shiftY==undefined)shiftY = 0;

		for(var i=0; i<items.length; ++i){
			items[i].translate(shiftX, shiftY)
		}
	},
	
	hide_all_layers: function() {
		var n = docRef.layers.length;
		
		for(var i=0; i<n; ++i) {
			
			layer = docRef.layers[i];
			
			lyr_name = layer.name;
			
			// any layers that start with + are always turned on
			if (this.isAdditionalLayer(layer)) {
				layer.visible = true;
			} else {
				layer.visible = false;
			}
		}
	},
	
	get_shown_layers: function() {
		var shown = []
		var n = docRef.layers.length;
		
		for(var i=0; i<n; ++i) {
			
			layer = docRef.layers[i];
			
			if(layer.visible){
				shown.push(i);
			}
		}
		return shown;
	},
	
	get_layer_bounds: function(layer) {
		var rect;
		var items = layer.pageItems;
		for(var i=0; i<items.length; ++i){
			var item = items[i];

			if(item.guides){
				continue;
			}
			var visBounds = item.visibleBounds;
			if(visBounds==null)continue;

			if(rect==null){
				rect = visBounds;
			}else{
				if(rect[0]>visBounds[0]){
					rect[0] = visBounds[0];
				}
				if(rect[1]<visBounds[1]){
					rect[1] = visBounds[1];
				}
				if(rect[2]<visBounds[2]){
					rect[2] = visBounds[2];
				}
				if(rect[3]>visBounds[3]){
					rect[3] = visBounds[3];
				}
			}
		}
		for(var i=0; i<layer.layers.length; ++i){
			var childRect = this.get_layer_bounds(layer.layers[i]);
			if(childRect==null)continue;

			if(rect==null){
				rect = childRect;
			}else{
				if(rect[0]>childRect[0]){
					rect[0] = childRect[0];
				}
				if(rect[1]<childRect[1]){
					rect[1] = childRect[1];
				}
				if(rect[2]<childRect[2]){
					rect[2] = childRect[2];
				}
				if(rect[3]>childRect[3]){
					rect[3] = childRect[3];
				}
			}
		}
		return rect;
	},
	
	intersects: function(rect1, rect2) {
		return !(  rect2[0] > rect1[2] || 
		           rect2[1] < rect1[3] ||
		           rect2[2] < rect1[0] || 
		           rect2[3] > rect1[1]);
	},
	
	
	show_layers: function(layerIndices) {
		var n = layerIndices.length;
		for(var i=0; i<n; ++i) {
			layer = docRef.layers[layerIndices[i]];
			layer.visible = true;
		}
	}
};



multi_exporter.init();