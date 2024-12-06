/*
    
    Version 0.8.3-BETA

 */
$(document).ready(function() {
    if ($('.calendar-presentation').length || $('.calendar-container').length) {

        var calendarPageMode = 0;
        var serverURL = $('.calendar-presentation').attr('data-server-url') || $('.calendar-container').attr('data-server-url') || undefined;

        function getBaseURL() {
            if (serverURL && serverURL.length > 0) {
                return serverURL;
            }
            var { protocol, host } = window.location;
            return `${protocol}//${host}`;
        }
        if($('.calendar-presentation').length){
            calendarPageMode = "presentation";
        }
        if($('.calendar-container').length && $('.calendar-container').attr('data-calendar-id') && isGuildMember != 0){
            calendarPageMode = "editor";
        }

        if(calendarPageMode == 0){
            return;
        }

        var Calendar = {
            init() {
                loadedCalendars = []


                if(calendarPageMode == "editor"){
                    $.ajax({
                        url: $('.calendar-container').attr('data-calendar-url'),
                        type: "GET",
                        dataType: "json",
                        async: true,
                        success: function(data) {

                            calendarData = Calendar.parseCalendar(data);
                            calendarData.renderTarget = "render" + "-" + calendarData.id.toString() + "-" + loadedCalendars.length;
                            calendarData.offset = calendarData.metadata.defaultYear;

                            Calendar.renderEditorInterface(calendarData);
                            calendarData = Calendar.applyPatches(calendarData);
                            Calendar.convertEventsToDates(calendarData);

                            loadedCalendars.push(calendarData);

                            //Create the div the calendar will render into.
                            var calendarRenderNode = document.createElement("div");
                            calendarRenderNode.setAttribute("id",calendarData.renderTarget);
                            $("#calendar-render")[0].appendChild(calendarRenderNode);

                            //Render the Calendar
                            Calendar.renderDays(calendarData);

                            //Binds the BBCode input bar
                            bindmention();

                            Calendar.refreshEditorMonthList(calendarData);
                            $( "#sortable" ).sortable({
                                placeholder: "ui-state-highlight"
                            });
                            $( "#sortable" ).disableSelection();
                        }
                    });
                }
                if(calendarPageMode == "presentation"){
                    jQuery.each($(".calendar-presentation"), function( i, val ) {
                        $.ajax({
                            url: (getBaseURL() + "/api/calendar/" + val.getAttribute("data-calendar-id")),
                            type: "GET",
                            dataType: "json",
                            async: true,
                            success: function(data) {

                                calendarData = Calendar.parseCalendar(data);
                                calendarData.renderTarget = "render" + "-" + calendarData.id.toString() + "-" + loadedCalendars.length;
                                calendarData.offset = val.getAttribute("data-calendar-year-offset");

                                loadedCalendars.push(calendarData);
                                Calendar.convertEventsToDates(calendarData);

                                //Create the div the calendar will render into.
                                var calendarRenderNode = document.createElement("div");
                                calendarRenderNode.setAttribute("id",calendarData.renderTarget);
                                val.appendChild(calendarRenderNode);

                                //Render the Calendar
                                Calendar.renderDays(calendarData);

                                var modalContent = "";
                                modalContent += '	<div class="col-md-6 col-md-offset-3 modal fade" id="modal-reader" class="user-css-calendar" tabindex="-1" role="dialog" aria-labelledby="modal-center-title" aria-hidden="true">';
                                modalContent+= '		<div class="modal-dialog modal-dialog-centered modal-content user-css-calendar" role="document">';
                                modalContent+= '			<div class="modal-header">';
                                modalContent+= '				<button type="button" class="close pull-right" data-dismiss="modal"  data-bs-dismiss="modal"  aria-label="Close">';
                                modalContent+= '					<span aria-hidden="true">&times;</span>';
                                modalContent+= '				</button>';
                                modalContent+= '				<h3 class="modal-title" id="modal-center-title"></h3>';
                                modalContent+= '				<label id="modal-subtitle" class="form-label"></label>';
                                modalContent+= '			</div>';
                                modalContent+= '			<div id="modal-body">';
                                modalContent+= '				<div id="modal-note-desc" class="container padding-10 fade in animated fadeInUp" style="width: 100%;"></div>';
                                modalContent+= '			</div>';
                                modalContent+= '			<div id="modal-footer" class="modal-footer "></div>';
                                modalContent+= '		</div>';
                                modalContent+= '	</div>';

                                $(".calendar-presentation")[0].innerHTML += modalContent;
                            }
                        });
                    });
                }

            },
            parseCalendar(data){
                if(data.metadata){
                    try {
                        data.metadata = JSON.parse(data.metadata);
                        data.metadata = data.metadata.name ? data.metadata : JSON.parse(data.metadata);
                        //legacy support for old double-parsed calendars
                    }
                    catch(error){
                        console.log("Failed to Parse Calendar Metadata");
                        data.metadata = {};
                        data.metadata.notes = [];
                    }
                } else {
                    data.metadata = {};
                    data.metadata.notes = [];
                    console.log("No Calendar Details Found");
                }
                return data;
            },
            renderDays(toRender) {

                if(toRender.metadata.days.length <1 || toRender.metadata.months.length <1){
                    return;
                }

                var htmlToAdd = '<div id="display-calendar-presentation" class="user-css-calendar panel panel-body ' + toRender.renderTarget + '">';
                htmlToAdd += '<h3 class="calendar-name">' + toRender.title + '</h3>';
                htmlToAdd += '<sup class="calendar-offset-text">As of the year ' + Number(toRender.offset) + '</sup>';
                htmlToAdd += '<div class="' + toRender.renderTarget + '-calendar-desc"></div>';

                var calendarDisplayTabs = '<ul class="nav nav-pills nav-fill calendar-nav" id="myTab" role="tablist">';
                var calendarDisplayContent = '<div class="tab-content" id="myTabContent">';

                var c_DayOfYear = 0;		//Todo: Unused?
                var v_DaysInWeek = toRender.metadata.daysPerWeek;
                var v_MonthsInYear = toRender.metadata.months.length;
                var v_DayOffset = ((Number(toRender.metadata.monthOffset) + (toRender.metadata.months.reduce((a, b) => a + (Number(b["length"]) || 0), 0) * toRender.offset)) % v_DaysInWeek);

                jQuery.each($(toRender.metadata.months), function( c_CurrentMonth, month) {

                    if(toRender.metadata.months[c_CurrentMonth].reset == true){
                        v_DayOffset = 0;
                    }

                    var v_DaysInMonth = parseInt(toRender.metadata.months[c_CurrentMonth].length) + parseInt(toRender.metadata.months[c_CurrentMonth].extension);
                    //We add the monthOffset to the Month Length to properly count the number of weeks because the offset can push us into a new week.
                    var v_WeeksInMonth = Math.ceil((Number(month.length) + Number(v_DayOffset)) / v_DaysInWeek);


                    var c_CurrentDay = 1;	//Tracks the day of the month we're on.
                    month.nameCleaned =  (toRender.renderTarget  + '-' + month.name.replace(/[|&;$%@"<>()+ ,']/g, ""));	//Used for the navigation tabs, we give each one its index in the loaded calendars and the calendar id to make it totally unique, then strip out breaking characters.

                    //This section changes the variables of things that work differently between backend and frontend bootstrap versions
                    var isBS3 = $.fn.modal.Constructor.VERSION !== undefined && $.fn.modal.Constructor.VERSION[0] === "3" ? true : false;
                    var navPresentationKey = isBS3 ? ' active in"' : ' active show in"';
                    var navActiveKey = (calendarPageMode == "editor" ? ' active in show"' : navPresentationKey);
                    var navMonthKey = month.nameCleaned;

                    //Save the tabs
                    calendarDisplayTabs += '<li class="nav-item' + (c_CurrentMonth == 0? ' active ':'') + '">';
                    calendarDisplayTabs += '<a class="nav-link ' + (c_CurrentMonth == 0? navActiveKey : '" ') + ' id="' + month.nameCleaned + '-tab" data-bs-toggle="tab" data-toggle="tab" monthName="' + month.name + '"';
                    calendarDisplayTabs += 'href="#' + navMonthKey + '" data-bs-target="#' + navMonthKey + '" role="tab" aria-controls="' + month.nameCleaned + '"' + (c_CurrentMonth == 0? ' aria-selected="true"' :'') + '>' + month.name+ '</a></li>';

                    //Content of a month—BEGIN TABLE
                    var navMonthClass =  month.nameCleaned + '-desc';
                    calendarDisplayContent += '<div class="tab-pane fade in' + (c_CurrentMonth == 0? navActiveKey : '" ');
                    calendarDisplayContent += 'id="' + navMonthKey + '" role="tabpanel" aria-labelledby="' + month.nameCleaned + '-tab">';
                    calendarDisplayContent += '<div class="' + navMonthClass + '"></div>';
                    calendarDisplayContent += '<table class="table table-fixed table-bordered" style="table-layout: fixed; width: 100%;">';
                    calendarDisplayContent += '<tbody>';

                    /*Start the month with the weekday names*/
                    //To-do: Allow toggling of this.
                    if((toRender.metadata.showDays == false) && typeof toRender.metadata.days != 'undefined'){
                        calendarDisplayContent += '<thead><tr>';
                        jQuery.each($(toRender.metadata.days), function( i, val ) { calendarDisplayContent += '<th scope="col" class="calendar-weekday">' + val + '</th>';	});
                        calendarDisplayContent += '</tr></thead>';
                    }

                    for (var c_wk = 0; c_wk < v_WeeksInMonth; c_wk++) {

                        calendarDisplayContent += '<tr>';
                        for (var c_WeekDay = 0; c_WeekDay < v_DaysInWeek; c_WeekDay++) {

                            if((v_DaysInMonth - c_CurrentDay) >= 0 && c_WeekDay >= v_DayOffset){

                                var today = (c_CurrentMonth).toString() + '-' + c_CurrentDay;
                                var showTodaysDate = "normal";

                                //Figure out if we have events today. If we do, iterate through them and add them to the Calendar.
                                var eventIndex = toRender.metadata.eventsdata.importantDates.map(function(o) { return o.date; }).indexOf(today);
                                var tags = "";

                                if(eventIndex == -1){
                                    calendarDisplayContent += '<td class="calendar-day" id="day-' + today + '">';
                                    if(calendarPageMode == "editor"){

                                        calendarDisplayContent += '<button type="button" note = "' + c_CurrentMonth.toString() + '-' + c_CurrentDay + '" id="edit-' + today + '"';
                                        calendarDisplayContent += '" class="btn btn-primary btn-sm load-note calendar-add-event" modal-action="add" data-toggle="modal"  data-target="#modal-reader"  data-bs-toggle="modal"  data-bs-target="#modal-reader"  style="float:right;">';
                                        calendarDisplayContent += '<i class="fas fa-calendar-plus" aria-hidden="true"></i></button>';
                                    }
                                    calendarDisplayContent += '<h3>' + c_CurrentDay + '</h3>';
                                    calendarDisplayContent += '<div id="' + toRender.renderTarget + '-note-' + c_CurrentMonth + '-' + c_CurrentDay + '" data-md="' + today + '">';
                                    calendarDisplayContent += '</div>'; //End of the Note Div
                                    calendarDisplayContent += Calendar.getCelestialHtmlForDate(toRender,toRender.offset,c_CurrentMonth,c_CurrentDay);
                                    calendarDisplayContent += "</td>"; //End of the Calendar TD
                                }
                                else if(eventIndex >= 0){
                                    jQuery.each($(toRender.metadata.eventsdata.importantDates[eventIndex].events), function( i , eventKey) {


                                        var note = toRender.metadata.notes[eventKey.noteIndex];
                                        tags += (note.buttonPresentation.tags.includes(eventKey.durationPlacement) ? toRender.metadata.notes[eventKey.noteIndex].tags : "");

                                        if(eventKey.durationPlacement == "head"){

                                            var eventIntercalary = toRender.metadata.notes[eventKey.noteIndex].intercalary;

                                            if(eventIntercalary.isDistinct || eventIntercalary.isNewWeekDuring){
                                                //Start the same day of the next week as a new table.
                                                if(eventIntercalary.dateAppearance != "normal" && showTodaysDate == "normal"){
                                                    showTodaysDate = eventIntercalary.dateAppearance;
                                                }
                                                for (var weekLoop = c_WeekDay ; weekLoop > 0 && weekLoop < v_DaysInWeek; weekLoop++) {
                                                    calendarDisplayContent += '<td class="calendar-day blank-day calendar-intercal-filler before"></td>';
                                                }
                                            }
                                            if(eventIntercalary.isNewWeekDuring){
                                                //Skip the rest of this week, place the event at the start of the next week.
                                                calendarDisplayContent += '</tr><tr>';
                                                c_WeekDay = 0;
                                                v_DayOffset = 0;
                                            }
                                            if(eventIntercalary.isDistinct){
                                                calendarDisplayContent += '</tr><tr></tbody></table><table class="table table-fixed table-bordered" style="table-layout: fixed; width: 100%;"><tbody>';
                                                for (var weekLoop = 0; weekLoop < c_WeekDay; weekLoop++) {
                                                    calendarDisplayContent += '<td class="calendar-day blank-day calendar-intercal-filler after"></td>';
                                                }
                                            }
                                        }
                                    });

                                    calendarDisplayContent += '<td class="calendar-day ' + tags + '" id="day-' + today + '">';

                                    if(calendarPageMode == "editor"){

                                        calendarDisplayContent += '<button type="button" note = "' + c_CurrentMonth.toString() + '-' + c_CurrentDay + '" id="edit-' + today + '"';
                                        calendarDisplayContent += '" class="btn btn-primary btn-sm load-note calendar-add-event" modal-action="add" data-bs-toggle="modal"  data-toggle="modal"  data-bs-target="#modal-reader"  data-target="#modal-reader" style="float:right;">';
                                        calendarDisplayContent += '<i class="fas fa-calendar-plus" aria-hidden="true"></i></button>';
                                    }

                                    if(showTodaysDate == "normal"){
                                        calendarDisplayContent += '<h3>' + c_CurrentDay + '</h3>';
                                    }else if(eventIndex >=0 && showTodaysDate == "unique"){
                                        //calendarDisplayContent += '<h3>' + c_CurrentDay - parseInt(toRender.metadata.notes[eventKey.noteIndex].day) + parseInt(toRender.metadata.notes[eventKey.noteIndex].duration.period) + '</h3>';
                                        //Todo: Allow for unique holiday dates
                                    }
                                    calendarDisplayContent += '<div id="' + toRender.renderTarget + '-note-' + c_CurrentMonth + '-' + c_CurrentDay + '" data-md="' + today + '">';
                                    calendarDisplayContent += '</div>'; //End of the Note Div
                                    calendarDisplayContent += Calendar.getCelestialHtmlForDate(toRender,toRender.offset,c_CurrentMonth,c_CurrentDay);
                                    calendarDisplayContent += "</td>"; //End of the Calendar TD

                                    jQuery.each($(toRender.metadata.eventsdata.importantDates[eventIndex].events), function( i , eventKey) {

                                        var eventIntercalary = toRender.metadata.notes[eventKey.noteIndex].intercalary;

                                        if((eventIntercalary.isDistinct || eventIntercalary.isNewWeekAfter) && eventKey.durationPlacement == "tail"){

                                            //End the week
                                            for (var weekLoop = c_WeekDay + 1;weekLoop < v_DaysInWeek; weekLoop++) {
                                                calendarDisplayContent += '<td class="calendar-day blank-day  calendar-intercal-filler"></td>';
                                            }
                                            //If it's distinct, end the distinction
                                            if(eventIntercalary.isDistinct){
                                                calendarDisplayContent += '</tr><tr></tbody></table><table class="table table-fixed table-bordered" style="table-layout: fixed; width: 100%;"><tbody>';
                                            }
                                            if(eventIntercalary.isNewWeekAfter){
                                                //Skip the rest of this week, place the event at the start of the next week.
                                                calendarDisplayContent += '</tr><tr>';
                                                c_WeekDay = v_DaysInWeek;
                                                v_DayOffset = v_DaysInWeek;
                                            } else{
                                                for (var weekLoop = 0;  weekLoop <= c_WeekDay; weekLoop++) {
                                                    calendarDisplayContent += '<td class="calendar-day blank-day  calendar-intercal-filler"></td>';
                                                }
                                            }
                                        }
                                    });
                                }

                                c_CurrentDay++; //Of month
                                c_DayOfYear++; 	//Of year
                                v_DayOffset++;	//Tracks which weekday a month begins and ends on

                                if(c_CurrentDay <= (v_DaysInMonth + 1 ) && c_WeekDay + 1 >= v_DaysInWeek){
                                    v_DayOffset = 0;
                                }
                            }
                            else {
                                calendarDisplayContent += '<td class="calendar-day blank-day"></td>';
                            }
                        }
                        calendarDisplayContent += '</tr>';
                    }
                    calendarDisplayContent += '</tbody></table></div>';
                });

                calendarDisplayTabs += '</ul>';
                calendarDisplayContent += '<div class="calendar-description"></div>';
                htmlToAdd +=  (calendarDisplayTabs + calendarDisplayContent + '</div>');

                //Reorder Notes here
                if(calendarPageMode == "editor"){
                    htmlToAdd += '<div class="panel panel-default" style="width:100%">'
                    htmlToAdd += '		<div class="panel-heading panel-primary">'
                    htmlToAdd += '			<button type="button" class="close" aria-label="collapse" data-toggle="collapse" data-target="#collapseAdvancedNotes" aria-expanded="false" aria-controls="collapseAdvancedNotes">';
                    htmlToAdd += '				<span aria-hidden="true">+</span>';
                    htmlToAdd += '			</button>';
                    htmlToAdd += '			<h3>Advanced Events Config</h3>';
                    htmlToAdd += '		</div>';
                    htmlToAdd += '		<div class="panel-body collapse" id="collapseAdvancedNotes">';
                    htmlToAdd += '			<h3>Reorder Events</h3>';
                    htmlToAdd += '			<div id="reorderNotes" skipsave="false">';
                    htmlToAdd += '			<p class="form-control-description">Order of operations may affect how your calendar renders intercalary holidays and the like.<br>If you have any issues, try reordering your holidays (drag and drop) to see if that fixes them, otherwise ignore this section.<br><br></p>';
                    htmlToAdd += '				<ul id="sortable" class="events-reordering ui-sortable">';
                    jQuery.each(toRender.metadata.notes, function( i , event) {
                        var subtitle = event.title.toLowerCase().replace(/ |,|'|-|%|&/g, "").substring(0,4);
                        htmlToAdd += '				<li class="ui-state-default btn btn-secondary btn-sm load-note btn-calendar ui-sortable-handle" notekey="' + i + '">';
                        htmlToAdd += '					<button id="' +  event.date + '-' + subtitle + '" data-bs-toggle="modal" data-bs-target="#modal-reader" data-toggle="modal" data-target="#modal-reader" note="' + event.date + '" key="' + event.key + '" calendar-id="' + toRender.renderTarget.split('-')[1] + '"  class="btn btn-primary pull-right btn-sm load-note" modal-action="edit">';
                        htmlToAdd += '						<i class="fas fa-edit" aria-hidden="true"> </i>';
                        htmlToAdd += '					</button>';
                        htmlToAdd +=					event.title;
                        htmlToAdd +=' 				</li>';
                    });
                    htmlToAdd += '				</ul><hr>';
                    htmlToAdd += '			</div>';
                    htmlToAdd += '		</div>';
                    htmlToAdd += '</div>';
                }

                $("#" + toRender.renderTarget)[0].innerHTML = htmlToAdd;
                //Render the month descriptions
                jQuery.each($(toRender.metadata.months), function( index, month) {
                    var navMonthKey = month.nameCleaned;
                    var navMonthClass =  month.nameCleaned + '-desc';
                    var monthTarget = '#' + navMonthKey + ' .' + navMonthClass;
                    renderBBCodeToTarget(month.desc,monthTarget);
                });

                //Render the Calendar Description
                jQuery.each(loadedCalendars, function( index, cal) {
                    var target = '.' + cal.renderTarget + '-calendar-desc';
                    renderBBCodeToTarget(toRender.metadata.description,target);
                });

                Calendar.renderEvents(toRender);

            },
            renderEvents(toRender){

                jQuery.each($(toRender.metadata.eventsdata.importantDates), function( x , calDate) {

                    var outputTarget = '#' + toRender.renderTarget + '-note-' + calDate.date;
                    var dateContent = "";

                    jQuery.each($(calDate.events), function(y , calEvent) {

                        var note = toRender.metadata.notes[calEvent.noteIndex];
                        var durationPlacement = calEvent.durationPlacement;

                        var printTitle = (note.buttonPresentation.title.includes(durationPlacement) ? note.title : "");
                        var printTitleOrdinal = (printTitle.length > 1 && note.duration.period > 1 ? (durationPlacement == "head" ? "begins" : (durationPlacement == "tail" ? "ends" : "") ) : "");
                        var printIcon = (note.buttonPresentation.icon.includes(durationPlacement) ? note.icon : "");
                        var subtitle = note.title.toLowerCase().replace(/ |,|'|-|%|&/g, "").substring(0,4);
                        var action = (calendarPageMode == "editor" ? "edit" : "view");

                        dateContent += '<button id="' +  calDate.date + '-' + subtitle + '" data-bs-toggle="modal" data-bs-target="#modal-reader"  data-toggle="modal" data-target="#modal-reader" note="' + calDate.date + '" key="' + note.key + '" calendar-id="' + toRender.renderTarget.split('-')[1] + '"  class="btn btn-secondary btn-sm load-note btn-calendar" modal-action="' + action + '">';
                        dateContent += '	<i class="' + printIcon + '" aria-hidden="true"> </i>';
                        dateContent += '		<span class="event-name">' + printTitle + '</span> <span class="event-ordinal">' + printTitleOrdinal + '</span>';
                        dateContent += '</button>';
                    });

                    $(outputTarget)[0].innerHTML += dateContent;

                });

            },
            renderEditorInterface(data){
                /*MODALS*/
                var InputText = '<div class="modal fade ibox" id="modal-reader" tabindex="-1" role="dialog" aria-labelledby="modal-center-title" class="user-css-calendar" aria-hidden="true">';
                InputText += '		<div class="modal-dialog modal-dialog-centered" role="document">';
                InputText += '			<div id="modal-body" class="modal-content ibox-content">';
                InputText += '				<div class="modal-header">';
                InputText += '					<h2 class="modal-title" id="modal-center-title">Event Editor</h2>';
                InputText += '					<button type="button" class="close" data-dismiss="modal" aria-label="Close">';
                InputText += '						<span aria-hidden="true">&times;</span>';
                InputText += '					</button>';
                InputText += '				</div>';
                InputText += '			<div id="event-content">';
                InputText += '				<div class="card-box card-box-dark">'
                InputText += '				     <h3>Overview</h3>';
                InputText += '					<h4>Name</h4>';
                InputText += '					<textarea id="modal-note-title" placeholder="The name of the event" rows="1" class="form-control"></textarea>';
                InputText += '					<h4>Date</h4>';
                InputText += '					<div class="form-group row">';
                InputText += '						<div class="col-sm-8">';
                InputText += '							<select class="form-control" id="select-event-month">';
                InputText += '					   	  	</select>';
                InputText += '				     	</div>';
                InputText += '				    	<div class="col-sm-4">';
                InputText += '				     		<input class="form-control"  type="number" id="select-event-day"></input>';
                InputText += '				     	</div>';
                InputText += '					</div>';
                InputText += '					<h4>Vignette</h4>';
                InputText += '					<textarea id="modal-note-desc" placeholder="What happens on this day? Write a vignette for your readers!" rows="5" class="mention form-control"></textarea>';
                InputText += '				     <p class="form-control-description">Adds a button to the holiday which opens a modal with this content</p>';
                InputText += '				</div>';
                InputText += '				<div class="card-box card-box-dark">';
                InputText += '				     <h3>Recurrence</h3><p class="form-control-description mt-2">Craft a formula for what dates the event occurs on!</p>';
                InputText += '				     <select id="repetition-select" class="form-control">';
                InputText += '				     	<optgroup label="Simple Options">';
                InputText += '				     		<option id="option-annual-on-date" value="annual-on-date">Annually, on this Date</option>';
                InputText += '				     		<option id="option-monthly-on-date" value="monthly-on-date">Monthly, on this Date</option>';
                InputText += '				     	</optgroup>';
                InputText += '				     	<optgroup disabled label="Upcoming Options!">';
                InputText += '				     		<option value="annual-on-date">On recurrences of this celestial alignment</option>';
                InputText += '				     		<option value="monthly-on-date">On this weekday of this week, monthly</option>';
                InputText += '				     	</optgroup>';
                InputText += '				     </select>';
                InputText += '				</div>';
                InputText += '				<div class="card-box card-box-dark">';
                InputText += '					<div class="form-text"><a class="fas fa-question-circle pull-right collapsed" data-toggle="collapse" href="#eventDurationHelp" aria-expanded="false" aria-hidden="true"><span class="sr-only">What is this?</span></a></div>';
                InputText += '					<h3>Duration</h3>';
                InputText += '					<p class="form-control-description">How many days the event lasts.</p>';
                InputText += '					<div id="eventDurationHelp" class="collapse">';
                InputText += '						<p class="form-control-description">If an event lasts more than one day, it will be added to as many subsequent days as well. A good option for triduum holidays!</p>';
                InputText += '						<p class="form-control-description">Pair this with the Intercalary option to create leap days and weeks!</p>';
                InputText += '					</div>';
                InputText += '					<input id="eventDuration" placeholder="1" min="1" step="1" oninput="validity.valid||(value=\'\');" type="number" class="form-control mt-3">';
                InputText += '					<hr>';
                InputText += '					<div class="form-text"><a class="fas fa-question-circle pull-right collapsed" data-toggle="collapse" href="#monthWrapHelp" aria-expanded="false" aria-hidden="true"><span class="sr-only">What is this?</span></a></div>';
                InputText += '					<h3>Month Wrapping</h3>';
                InputText += '					<p class="form-control-description">Whether or not the event can spill into the next month</p>';
                InputText += '					<div id="monthWrapHelp" class="collapse">';
                InputText += '						<p class="form-control-description">This setting toggles weather or not an event may roll into the next month in cases where the Duration extends past the last day of the month.</p>';
                InputText += '					</div>';
                InputText += '					<div class="form-check mt-2">';
                InputText += '						<input type="checkbox" class="form-check-input" id="toggleMonthWrap">';
                InputText += '						<label class="form-check-label" for="toggleMonthWrap">Wrap this event across months</label>';
                InputText += '					</div>';
                InputText += '				</div>';
                InputText += '				<div class="card-box card-box-dark">';
                InputText += '				<div class="form-text"><a class="fas fa-question-circle pull-right collapsed" data-toggle="collapse" href="#intercalaryHelp" aria-expanded="false" aria-hidden="true"><span class="sr-only">What is this?</span></a></div>';
                InputText += '					<h3>Intercalary</h3>';
                InputText += '					<p class="form-control-description">Used for creating leap days and holidays which disrupt months.</p>';
                InputText += '					<div id="intercalaryHelp" class="collapse">';
                InputText += '						<p class="form-control-description">If you check the below box, this event will insert  into the calendar on the date specified, displacing as many days as you set the Duration to be.</p>';
                InputText += '						<p class="form-control-description">If you do <i>not</i> check the below box, the event will add itself to the existing days starting at the specified date and lasting through its duration.</p>';
                InputText += '						<p class="form-control-description">This is how you make leap days.</p>';
                InputText += '					</div>';
                InputText += '					<div class="form-check mt-2">';
                InputText += '						<input type="checkbox" class="form-check-input" id="toggleIntercalaryState">';
                InputText += '						<label class="form-check-label" for="toggleIntercalaryState">This Event is Intercalary</label>';
                InputText += '					</div>';
                InputText += '					<hr>';
                InputText += '					<b>Advanced Configuration</b>';
                InputText += '					<div class="form-check">';
                InputText += '						<div class="form-text"><a class="fas fa-question-circle pull-right collapsed" data-toggle="collapse" href="#toggleIntercalaryAfterHelp" aria-expanded="false" aria-hidden="true">';
                InputText += '							<span class="sr-only">What is this?</span>';
                InputText += '						</a></div>';
                InputText += '						<input type="checkbox" disabled class="form-check-input" id="toggleIntercalaryAfter">';
                InputText += '						<label class="form-check-label" for="toggleIntercalaryAfter">Offset the beginning of this event one day forward</label>';
                InputText += '						<div id="toggleIntercalaryAfterHelp" class="collapse">';
                InputText += '							<p class="form-control-description mb-2">Helpful for adding events which add to the end of the month, such as the Gregorian Leap Year. This makes the event <u>appear</u> a day later.</p>';
                InputText += '						</div>';
                InputText += '					</div>';
                InputText += '					<div class="form-check">';
                InputText += '						<div class="form-text"><a class="fas fa-question-circle pull-right collapsed" data-toggle="collapse" href="#toggleDisplayDistinctHelp" aria-expanded="false" aria-hidden="true">';
                InputText += '							<span class="sr-only">What is this?</span>';
                InputText += '						</a></div>';
                InputText += '						<input type="checkbox" disabled class="form-check-input" id="toggleDisplayDistinct">';
                InputText += '						<label class="form-check-label" for="toggleDisplayDistinct">Make this event distinct from the rest of the month</label>';
                InputText += '						<div id="toggleDisplayDistinctHelp" class="collapse">';
                InputText += '							<p class="form-control-description mb-2">Visually distinguishes the event by spacing it apart from the other weeks of the month. Helpful for calendars with holidays at their end.</p>';
                InputText += '						</div>';
                InputText += '					</div>';
                InputText += '					<div class="form-check">';
                InputText += '						<input type="checkbox" disabled class="form-check-input" id="toggleNewWeekDuring">';
                InputText += '						<label class="form-check-label" for="toggleNewWeekDuring">Event start marks the beginning of a new week</label>';
                InputText += '					</div>';
                InputText += '					<div class="form-check">';
                InputText += '						<input type="checkbox" disabled class="form-check-input" id="toggleNewWeekAfter">';
                InputText += '						<label class="form-check-label" for="toggleNewWeekAfter">Event end marks the beginning of a new week</label>';
                InputText += '					</div>';
                //TODO: Reinstate Date Behavior
                /*InputText += '				     <div class="form-group mt-2 row">';
                 InputText += '				     	<label for="select-tags-appearance" class="col-sm-3 col-form-label">Date Behavior (WIP)</label>';
                InputText += '				    	 <div class="col-sm-9">';
                InputText += '				     		<select class="form-control" id="select-intercalary-date-appearance">';
                InputText += '				   	  			<option id="option-date-normal" value="normal">Dates are shown during this event.</option>';
                InputText += '				   	  			<option id="option-date-unique" value="unique">Dates show, but the count is reset to 1.</option>';
                InputText += '				   	  			<option id="option-date-hidden" value="hidden">Dates aren\'t shown during the event.</option>';
                InputText += '					   	  </select>';
                InputText += '				     	</div>';
                InputText += '					</div>';	*/
                InputText += '				</div>';
                InputText += '				<div class="card-box card-box-dark">';
                InputText += '				    <h3>Presentation Settings</h3>';
                InputText += '					<h4>Event Note Icon</h4>';
                InputText += '				     <p class="form-control-description">Customize the icon on the Event button with an icon from <a href="https://fontawesome.com/icons?d=gallery">here</a><p>';
                InputText += '					<div class="input-group">';
                InputText += '						<div class="input-group-prepend"><span class="input-group-text btn-primary" id="noteIconPreview"><i class="fas fa-book-open"></i></span></div>';
                InputText += '						<input type="text"  id="modal-note-icon" class="form-control" placeholder="fas fa-book-open" aria-describedby="noteIconPreview"></input>';
                InputText += '				     </div>';
                InputText += '					<hr>';
                InputText += '				     <h4>CSS Style Tags</h4>';
                InputText += '					<p class="form-control-description">Classes added here will be added to the CSS of the day of the event</p>';
                InputText += '				     <textarea id="modal-note-tags" placeholder="Tags, separated by spaces" rows="1" class="form-control mt-2"></textarea>';
                InputText += '					<div class="form-text text-center"><a class="collapsed" data-toggle="collapse" href="#styleTagHelp" aria-expanded="false" aria-hidden="true">Click for premades</a></div>';
                InputText += '					<div id="styleTagHelp" class="collapse">';
                InputText += '					    <p class="form-control-description">These are added as styles to the event. Here are some premades to get you started. Define your own in your CSS and write them in above!</p>';
                InputText += '					    <div style="margin-top:0.5em;display: grid;grid-gap: 10px;grid-auto-rows: minmax(0px, auto);grid-template-columns: repeat(5, 1fr);">';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="success" >Celebration</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="info" >Official</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="warning" >Memorial</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="danger" >Disaster</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-inset" >Inset</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-outset" >Outset</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-crossed" ><i class="fas fa-times"></i> Icon</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-checked" ><i class="fas fa-check"></i> Icon</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-alert" ><i class="fas fa-exclamation"></i> Icon</button>';
                InputText += '					    	<button type="button" class="btn btn-sm btn-outline-secondary add-tag" tagToAdd="calendar-day-info" ><i class="fas fa-info"></i> Icon</button>';
                InputText += '					    </div>';
                InputText += '					    <p class="form-control-description text-muted">Note: Many of these affect the same attributes and won\'t work together.</p>';
                InputText += '					</div>';
                InputText += '					<hr>';
                InputText += '				     <h4>Appearance</h4>';
                InputText += '				     <div class="form-group row">';
                InputText += '				     	<label for="select-title-appearance" class="col-sm-4 col-form-label">The Title Appears:</label>';
                InputText += '				    	 <div class="col-sm-8">';
                InputText += '				     		<select class="form-control" id="select-title-appearance">';
                InputText += '				   	  			<option id="option-title-every-day" value="head-body-tail">...every day of the event</option>';
                InputText += '				   	  			<option id="option-title-first-day" value="head">...only on the first day</option>';
                InputText += '				   	  			<option id="option-title-only-first-and-last-days" value="head-tail">...only on the <u>first</u> and <u>last</u> days</option>';
                InputText += '				  	 	  		<option id="option-title-exclude-first-and-last-days" value="body">...every day, <u>excluding</u> the first and last</option>';
                InputText += '				 	  	  		<option id="option-title-never" value="never">...on none of the days of the event.</option>';
                InputText += '					   	  </select>';
                InputText += '				     	</div>';
                InputText += '				     </div>';
                InputText += '				     <div class="form-group row">';
                InputText += '				     	<label for="select-icon-appearance" class="col-sm-4 col-form-label">The Icon Appears:</label>';
                InputText += '				    	 <div class="col-sm-8">';
                InputText += '				     		<select class="form-control" id="select-icon-appearance">';
                InputText += '				   	  			<option id="option-icon-every-day" value="head-body-tail">...every day of the event</option>';
                InputText += '				   	  			<option id="option-icon-first-day" value="head">...only on the first day</option>';
                InputText += '				   	  			<option id="option-icon-only-first-and-last-days" value="head-tail">...only on the <u>first</u> and <u>last</u> days</option>';
                InputText += '				  	 	  		<option id="option-icon-exclude-first-and-last-days" value="body">...every day, <u>excluding</u> the first and last</option>';
                InputText += '				 	  	  		<option id="option-icon-never" value="never">...on none of the days of the event.</option>';
                InputText += '					   	  </select>';
                InputText += '				     	</div>';
                InputText += '				     </div>';
                InputText += '				     <div class="form-group row">';
                InputText += '				     	<label for="select-tags-appearance" class="col-sm-4 col-form-label">The Tags Appear:</label>';
                InputText += '				    	 <div class="col-sm-8">';
                InputText += '				     		<select class="form-control" id="select-tags-appearance">';
                InputText += '				   	  			<option id="option-tags-every-day" value="head-body-tail">...every day of the event</option>';
                InputText += '				   	  			<option id="option-tags-first-day" value="head">...only on the first day</option>';
                InputText += '				   	  			<option id="option-tags-only-first-and-last-days" value="head-tail">...only on the <u>first</u> and <u>last</u> days</option>';
                InputText += '				  	 	  		<option id="option-tags-exclude-first-and-last-days" value="body">...every day, <u>excluding</u> the first and last</option>';
                InputText += '				 	  	  		<option id="option-tags-never" value="never">...on none of the days of the event.</option>';
                InputText += '					   	  </select>';
                InputText += '				     	</div>';
                InputText += '				     </div>';
                InputText += '				</div>';
                InputText += '			</div>';
                InputText += '			<div class="modal-footer">';
                InputText += '				<button type="button" id="note-save" class="btn btn-primary note-save" data-dismiss="modal" >Save changes</button>';
                InputText += '				<button type="button" id="note-delete" class="btn btn-secondary note-delete" data-dismiss="modal" >Delete Note</button>';
                InputText += '				<button type="button" class="btn btn-secondary" data-dismiss="modal">Close</button>';
                InputText += '			</div>';
                InputText += '		</div>';
                InputText += '	</div>';
                InputText += '</div>';

                InputText+= '<div class="alert alert-info padding-10">';
                InputText+= '		<h3 class="header-title">Calendars (BETA) allow you to:</h3>';
                InputText+= '		<p>';
                InputText+= '			<ul>';
                InputText+= '				<li>Name your week days and months.</li>';
                InputText+= '				<li>Track moon phases.</li>';
                InputText+= '				<li>Keep track of annual events and celebrations.</li>';
                InputText+= '			</ul>';
                InputText+= `			Check the <a href="https://www.worldanvil.com/w/WorldAnvilCodex/a/calendars" target="_blank" >Guide to Calendars</a> for help about this feature.`;
                InputText+= '		</p>';
                InputText+= '</div>';


                InputText += '<div id="calendar-render-input" class="card-box card-box-dark user-css-calendar">';
                InputText += '	<div id="calendar-updates-box" class="alert alert-warning"><h3>Version Patches <small><small>(No action required except saving your calendar)</small></small></h3></div>';
                InputText += '	<div class="row">';
                InputText += '		<div class="col-md-3 offset-md-6">';
                InputText += '			<div class="cp btn btn-default btn-block pull-right" data-clipboard-text="[calendar:' + data.id + ']"><i class="far fa-clipboard"> </i> Copy Calendar BBCode</div>';
                InputText += '		</div>';
                InputText += '		<div class="col-md-3">';
                InputText += '			<button data-id="' + data.id + '" class="calendar-save btn btn-primary btn-block pull-right"><i class="fas fa-save"> </i> Save</button><br><br>';
                InputText += '		</div>';
                InputText += '	</div>';
                InputText += '	<h2>Calendar Edit</h2>';
                InputText += '	<i>Input all of the information for your calendar to see it previewed below. Share it by embedding it into an article.</i>';
                InputText += '	<hr>';
                InputText += '	<div class="row">';
                InputText += '		<div class="col-md-12">';
                InputText += '			<h4 class="header-title">Calendar Name</h4>';
                InputText += '			<input type="text" id="calendar_name" class="form-control" value="' +data.title + '"></input>';
                InputText += '		</div>';
                InputText += '		<div class="col-md-12">'
                InputText += '			<h4 class="header-title">Description</h4>';
                InputText += '			<textarea id="calendar-description" placeholder="Calendar description" rows="10" class="form-control mention">' + (data.metadata.description? data.metadata.description : "")  + '</textarea>';
                InputText += '		</div>';
                InputText += '	</div>';
                InputText += '	<br>';
                InputText += '	<div class="row">';
                InputText += '		<div class="col-md-4">'
                InputText += '			<h4 class="header-title">Preview Year</h4>';
                InputText += '			<p class="form-control-description text-muted">The year of the below preview. To change the year on the embed, add a \'|\' and a year number in the bbcode. For example: [calendar:ID|YEAR]</p>';
                InputText += '			<input type="number" id="calendar_year" class="form-control" value = "' + data.metadata.defaultYear + '"></input>';
                InputText += '			<label><input type="checkbox" id="yearZeroToggle"> This calendar counts from 0</label>';
                InputText += '		</div>';
                InputText += '		<div class="col-md-4">'
                InputText += '			<h4 class="header-title">Day Offset</h4>';
                InputText += '			<p class="form-control-description text-muted">How many days the first day of the first year is offset by.</p>';
                InputText += '			<input type="number" id="calendar_monthOffset" class="form-control" value = "' + data.metadata.monthOffset + '"></input>';
                InputText += '		</div>';
                InputText += '	</div>';

                InputText += '<br><br>'

                //Add the Weekdays section
                InputText += '<div class="panel panel-default" style="width:100%">'
                InputText += '	<div class="panel-heading panel-primary">'
                InputText += '		<button type="button" class="close" aria-label="collapse" data-toggle="collapse" data-target="#collapseDays" aria-expanded="false" aria-controls="collapseDays">';
                InputText += '			<span aria-hidden="true">&plus;</span>';
                InputText += '		</button>';
                InputText += '		<h3>Weekdays</h3>';
                InputText += '	</div>';
                InputText += '	<div class="panel-body collapse" id="collapseDays">';
                InputText += '		<label><input type="checkbox" id="monthHeaderToggle">  Hide the names of the days of the week in presentation. <b>Note!</b>You must still add weekdays for a calendar to work. This defines how many days wide a calendar is!</label><br>';
                InputText += '		<h4>Week Configuration</h4>';
                InputText += '		<ul id="daysConfig" class="list-group week-objects">';
                if(typeof data.metadata.days != 'undefined'){
                    jQuery.each($(data.metadata.days), function( i, val ) {
                        InputText += buildWeekdayObjectConfigLI(i,val);
                    });
                }
                InputText += '		</ul>';
                InputText += '		<button id="btn-add-new-weekday" class="btn btn-primary btn-block">Add Weekday</button>';
                InputText += '	</div>';
                InputText += '</div>';


                //Add the Months Per Year section
                InputText += '<div class="panel panel-default" style="width:100%">'
                InputText += '	<div class="panel-heading panel-primary">'
                InputText += '		<button type="button" class="close" aria-label="collapse" data-toggle="collapse" data-target="#collapseMonths" aria-expanded="false" aria-controls="collapseMonths">';
                InputText += '			<span aria-hidden="true">&plus;</span>';
                InputText += '		</button>';
                InputText += '		<h3>Months</h3>';
                InputText += '	</div>';
                InputText += '	<div class="panel-body collapse" id="collapseMonths">';
                InputText += '		<label><input type="checkbox" id="monthResetToggle">  The first of each month resets to the first weekday (Negates DayOffset)</label><br>';
                InputText += '		<h4>Month Configuration</h4>';
                InputText += '		<ul id="monthConfig" class="list-group month-objects">';
                if(typeof data.metadata.months != 'undefined'){
                    jQuery.each($(data.metadata.months), function( i, val ) {
                        InputText += buildMonthObjectConfigLI(i,val);
                    });
                }
                InputText += '		</ul>';
                InputText += '		<button id="btn-add-new-month" class="btn btn-primary btn-block">Add Month</button>';
                InputText += '	</div>';
                InputText += '</div>';


                //Add the Celestial Bodies section
                InputText+= '<div class="panel panel-default" style="width:100%">'
                InputText += '	<div class="panel-heading panel-primary">'
                InputText += '		<button type="button" class="close" aria-label="collapse" data-toggle="collapse" data-target="#collapseCelestials" aria-expanded="false" aria-controls="collapseCelestials">';
                InputText += '			<span aria-hidden="true">&plus;</span>';
                InputText += '		</button>';
                InputText += '		<h3>Celestial Objects</h3>';
                InputText += '	</div>';
                InputText+= '		<div class="panel-body collapse" id="collapseCelestials">';
                InputText+= '			<ul id="celestialsConfig" class="list-group celestial-objects">';
                if(typeof data.metadata.celestials != 'undefined'){
                    jQuery.each($(data.metadata.celestials), function( i, val ) {
                        InputText += buildCelestialObjectInputLI(i,val);
                    });
                }
                InputText += '		</ul>';
                InputText += '		<button id="btn-add-new-celestial" class="btn btn-primary btn-block">Add Celestial Object</button>';
                InputText += '	</div>';
                InputText += '</div>';

                //Ends the column and the row
                $('.calendar-container +.row .col-md-8 .form-horizontal')[0].innerHTML = InputText;


                /*THIS SECTION BUILDS THE OUTPUT FIELD*/
                $('.calendar-container +.row .col-md-8 .form-horizontal').append('<div id="calendar-render" class="card-box card-box-dark"><h4 class="header-title">Output</h4></div>');

                $('.calendar-container +.row .col-md-8 .form-horizontal').append('<div id="calendar-json" class="card-box card-box-dark"><h2 class="header-title">Export/Import</h2></div>');
                $('#calendar-json')[0].innerHTML += '<h4 class="header-title">JSON</h4><textarea id="calendar-json-out" placeholder="Generated from this Calendar" rows="5" class="form-control">' + JSON.stringify(data.metadata) + '</textarea>';
                $('#calendar-json')[0].innerHTML += '<h4 class="header-title">WA Import</h4><textarea id="calendar-json-in" placeholder="Paste in the JSON of another Calendar Here" rows="5" class="form-control"></textarea>';
                $('#calendar-json')[0].innerHTML += '<button data-id="' + data.id + '-import" class="import-save btn btn-primary">Import Calendar</button';

                if(typeof data.metadata != "undefined"
                    && typeof data.metadata.months != "undefined"
                    && data.metadata.months.length > 0){
                    $("#monthResetToggle")[0].checked = ( data.metadata.months[0].reset ? data.metadata.months[0].reset : false ) //Array in case I make it individual later
                    $("#monthHeaderToggle")[0].checked = (data.metadata.showDays ? data.metadata.showDays : false);
                    $("#yearZeroToggle")[0].checked = (data.metadata.startAtZero ? data.metadata.startAtZero  : false);
                }

            },
            renderPreview(toRender){
                //Only used in Editor Preview
                Calendar.convertEventsToDates(toRender);
                Calendar.renderDays(toRender);
                Calendar.buildEventsReorderList(toRender);
                Calendar.refreshEditorMonthList(toRender);
            },
            save(dataToSave) {
                $.ajax({
                    url: $('.calendar-container').attr('data-calendar-url'),
                    type: "POST",
                    dataType: "json",
                    data: dataToSave,
                    async: true,
                    success: function(response) {
                        location.reload();
                    }
                });
            },
            applyPatches(data){

                //0.6.5 Version Patch: Converts old calendar notes into the new format.
                if(typeof data.metadata.notes != 'undefined'){

                    if(!Array.isArray(calendarData.metadata.notes)){

                        calendarData.metadata.notes = [];
                    }
                    if(typeof data.metadata.calendarVersion != "string"){
                        data.metadata.calendarVersion = "New Calendar";
                    }

                    var patchNotes ="";
                    var majorVersion = Number(data.metadata.calendarVersion.split('.')[1]);


                    jQuery.each($(data.metadata.notes), function( i, val ) {
                        if(typeof val.recurrence == 'undefined'){
                            patchNotes += '(0.7.0 Update) Updating "' + val.title + '" to occur annually. You can change this in the event\'s editor.<br>';
                            val.recurrence = "annual-on-date";
                        }
                        if(typeof val.month == 'undefined'){
                            val.month = val.date.split("-")[0];
                            val.day = val.date.split("-")[1];
                        }
                        if(typeof val.key == 'undefined'){
                            val.key = val.month + '-' + val.day + "-" + (val.icon ? val.icon.split("-").slice(-1)[0] : "empty") + '-' + (val.title && val.title.trim().length > 1 ? val.title.toLowerCase().replace(/[^a-z0-9]+/gi,"") : "empty");
                        }
                        if(majorVersion < 7 && val.tags && val.tags.includes("alert")){
                            val.tags = val.tags.replace("alert-","");
                            val.tags = val.tags.replace("alert","");
                            patchNotes += '(0.7.0 Update) "Alert-" removed from style tags from "' + val.title+ '", this is a one-time operation<br>';
                        }
                    });

                    $("#calendar-updates-box")[0].innerHTML += patchNotes;
                    if(patchNotes == ""){
                        $("#calendar-updates-box").remove();
                    }
                }
                return data;
            },
            addEventToDate(calendar, calDate, calEvent, calEventIndex){

                var month = calDate.split('-')[0];					//Counts from 0
                var day = parseInt(calDate.split('-')[1]);		//Counts from 1 (Yeah yeah, I know. I caught it too late.)

                if(calEvent.intercalary.isAfter){
                    day += 1;
                }

                for(var dayCount = 0; dayCount < calEvent.duration.period; dayCount++){

                    //Account for events wrapping into the next month.
                    if(day > calendar.metadata.months[month].length){
                        if(calEvent.duration.isWrapped){
                            if((parseInt(month) + 1) < calendar.metadata.months.length){
                                parseInt(month++);
                                day=1
                            }else{
                                month = 0;
                                day=1;
                            }
                        }else { break; }
                    }

                    //Track if this is a first/last/middle day. Used for some presentation configurations.
                    var durationPlacement = (dayCount == 0 ? "head" : (dayCount == calEvent.duration.period - 1? "tail" : "body" ));

                    //Create a date object at this date if one doesn't exist
                    var curDate = (month).toString() + "-" + (day).toString();
                    var dateIndex = calendar.metadata.eventsdata.importantDates.map(function(o) { return o.date; }).indexOf(curDate);
                    if(dateIndex < 0){
                        calendar.metadata.eventsdata.importantDates.push({date: curDate,events:[]});
                        dateIndex = calendar.metadata.eventsdata.importantDates.length - 1;
                    }

                    calendar.metadata.eventsdata.importantDates[dateIndex].events.push({noteIndex:calEventIndex,durationPlacement:durationPlacement});
                    day++;
                }

            },
            convertEventsToDates(calendar){

                calendar.metadata.eventsdata ={
                    importantDates:[],
                    countOfUniqueEvents: calendar.metadata.notes.length,
                    countOfDaysWithEvents: 0,
                    countOfTotalEvents: 0
                };

                jQuery.each($(calendar.metadata.months), function( i, calMonth ) {
                    calMonth.extension = 0;
                });

                jQuery.each($(calendar.metadata.notes), function( i, calEvent ) {

                    if(!calEvent.title)				{	calEvent.title 	= 	"Untitled Event";	}
                    if(!calEvent.note)				{	calEvent.note 	= 	"";	}
                    if(!calEvent.tags)				{	calEvent.tags 	= 	"";	}
                    if(!calEvent.recurrence)	{	calEvent.recurrence 	= 	"annual-on-date";	}
                    if(!calEvent.icon)				{	calEvent.icon				= 	"fas fa-book-open";	}
                    if(!calEvent.duration){calEvent.duration = {period:1,isWrapped:false};}
                    if(!calEvent.intercalary){calEvent.intercalary = {
                        isActive: false,
                        isAfter: false,
                        isDistinct: false,
                        isNewWeekDuring:false,
                        isNewWeekAfter:false,
                        dateAppearance:"normal"};
                    }

                    var eventCopy = calEvent;

                    //dateAppearance:$("#select-intercalary-date-appearance")[0].value
                    if(!calEvent.buttonPresentation){calEvent.buttonPresentation = {title:"head-body-tail", icon:"head-body-tail", tags:"head-body-tail"};}

                    if(calEvent.intercalary.isAfter){
                        eventCopy.day = parseInt(eventCopy.day) + 1;
                        eventCopy.date = eventCopy.month + '-' + eventCopy.day;
                        console.log("Date changed from " + calEvent.date + " to " + eventCopy.date);

                    }

                    //Now append each date according to its recurrence logic.
                    if(calEvent.recurrence == "annual-on-date"){
                        Calendar.addEventToDate(calendar,eventCopy.date,eventCopy,i);
                        calendar.metadata.eventsdata.countOfTotalEvents++;
                    }
                    else if(calEvent.recurrence == "monthly-on-date"){
                        jQuery.each($(calendarData.metadata.months), function( x, val ) {
                            var thisDay =  "" + x + "-" + eventCopy.day;
                            Calendar.addEventToDate(calendar,thisDay,eventCopy,i);
                            calendar.metadata.eventsdata.countOfTotalEvents++;
                        });
                    }

                    //Extend month lengths based on the events
                    if(calEvent.intercalary.isActive){
                        calendar.metadata.months[parseInt(eventCopy.month)].extension += parseInt(eventCopy.duration.period);
                    }

                });

                calendar.metadata.eventsdata.countOfDaysWithEvents = calendar.metadata.eventsdata.importantDates.length;
            },
            yearSinceZero(calendar, curYear){

                //Calculate difference between current year and the first year of this calendar

                //Assuming we are *on* year 3: on a startAtOne calendar we're 2 years and change from start; on a startAtZero we are 3 years and change from start.
                //Ergo at startAtZero we do not change the current year for the sake of math, but for startAtOne we lower it by 1.
                //Assuming we are *on* a negative year, we just use the absolute value because either way we are that far from 0
                if(calendar.metadata.startAtZero == false && curYear > 0){
                    curYear--;
                }
                return Math.abs(curYear);
            },
            getSinceZero(calendar, curYear, curMonth, curDay){

                curYear = Calendar.yearSinceZero(calendar,curYear);
                curDay --; //Today isn't over so we discount by 1

                var daysPerYear = calendar.metadata.months.reduce((a, b) => a + (Number(b["length"]) || 0), 0);
                var sumOfPastMonths = 0;
                jQuery.each($(calendar.metadata.months), function( i, val ) {
                    if(i < curMonth){
                        sumOfPastMonths += Number(val.length);
                    }
                });
                var totalDaysThisYear = (sumOfPastMonths + curDay);


                var totalIntercalaryDaysEver = 0;
                jQuery.each($(calendar.metadata.notes), function( i, calEvent ) {

                    var annualFrequency = 0;
                    var occurencesThisYear = 0;

                    if(calEvent.intercalary.isActive){

                        if(calEvent.recurrence == "annual-on-date"){
                            annualFrequency = 1;
                            if(parseInt(calEvent.month) < curMonth || (parseInt(calEvent.month) == curMonth && parseInt(calEvent.day) <= curDay)){
                                occurencesThisYear = 1;
                            }
                        }else if(calEvent.recurrence == "monthly-on-date"){
                            annualFrequency = 12;
                            occurencesThisYear = curMonth;
                            if(parseInt(calEvent.day) < curDay){
                                occurencesThisYear--;
                                //It's happened as either as many times as there are months, or one less.
                            }
                        }
                    }

                    var totalOccurences = Math.floor(annualFrequency * curYear) + occurencesThisYear;
                    totalIntercalaryDaysEver += parseInt(calEvent.duration.period) * totalOccurences;
                });

                var totalDaysSinceZero = (curYear * daysPerYear) + totalDaysThisYear + totalIntercalaryDaysEver;
                return totalDaysSinceZero;
            },
            getSingleCelestialHTML(calendar,year,month,day, celestial, celestialIndex, text = false){

                var htmlToReturn = "";
                var phaseClass =  "";
                year = parseInt(year);
                month = parseInt(month);
                day = parseInt(day);

                var totalOffset = Number(celestial.shift) + Calendar.getSinceZero(calendar,year,month,day) ;
                var phasePercent = ((1/celestial.cycle)) * (totalOffset % celestial.cycle);
                var phaseName = "";

                if(typeof celestial.showphases == "undefined" || celestial.showphases === false)
                {	phaseClass+="celestial-phase-full";								phasePercent = 0.5;		phaseName = celestial.phaseNames.full;		}
                else if(phasePercent < 0.1)	{	phaseClass+="celestial-phase-new";							phaseName = celestial.phaseNames.new; 												}
                else if(phasePercent < 0.2)	{	phaseClass+="celestial-phase-young";						phaseName = celestial.phaseNames.young; 												}
                else if(phasePercent < 0.3)	{	phaseClass+="celestial-phase-waxing-crescent";		phaseName = celestial.phaseNames.waxingCrescent; 							}
                else if(phasePercent < 0.4)	{	phaseClass+="celestial-phase-waxing-quarter";		phaseName = celestial.phaseNames.waxingQuarter; 								}
                else if(phasePercent < 0.5)	{	phaseClass+="celestial-phase-waxing-gibbous";		phaseName = celestial.phaseNames.waxingGibbous; 							}
                else if(phasePercent < 0.6)	{	phaseClass+="celestial-phase-full";								phaseName = celestial.phaseNames.full; 													}
                else if(phasePercent < 0.7)	{	phaseClass+="celestial-phase-waning-gibbous";		phaseName = celestial.phaseNames.waningGibbous; 							}
                else if(phasePercent < 0.8)	{	phaseClass+="celestial-phase-waning-quarter";		phaseName = celestial.phaseNames.waningQuarter; 								}
                else if(phasePercent < 0.9)	{	phaseClass+="celestial-phase-waning-crescent";		phaseName = celestial.phaseNames.waningCrescent; 							}
                else if(phasePercent <= 1)		{	phaseClass+="celestial-phase-old";							phaseName = celestial.phaseNames.old; 													}

                htmlToReturn += '<div  class="celestial-object">';
                htmlToReturn += '	<button class="btn' + (calendarPageMode == "presentation"?' load-celestial':"") + ' celestial-phase ' + phaseClass + ' ' +  celestial.name + ' ' + phaseName.replace(' ','-') +'"  note="' + month + '-'  + day;
                htmlToReturn += '"		calendar-index="' + calendar.renderTarget.split('-')[1] + '" celestial-index= "' + celestialIndex + '" data-toggle="modal" data-bs-toggle="modal" ' +  (calendarPageMode == "presentation" ? 'data-target="#modal-reader" data-bs-target="#modal-reader" ':' ') + '>';
                htmlToReturn += '			<div class="moon" style="--scale-lightgray:'+ celestial.color +'" >';
                htmlToReturn += '				<i class="' + celestial.icon + ' fa-2x celestial-icon"></i>';
                htmlToReturn += '				<div class="disc" style="transform: rotateY(' + ( phasePercent <= 0.5 ? (phasePercent * 360) : (180 - (phasePercent - 0.5) * 360) )+'deg);"></div>';
                htmlToReturn += '			</div>';
                htmlToReturn += '	</button>';
                if(text){
                    htmlToReturn += '<span class ="celestial-modal-text text-center padding-10">' + celestial.name + ' is in ' + phaseName +'</span>';
                }
                htmlToReturn += '</div>';
                return htmlToReturn;
            },
            getCelestialHtmlForDate(calendar,year,month,day){

                var htmlToReturn = '<div class="celestials">';
                jQuery.each($(calendar.metadata.celestials), function( celestialIndex, celestial ) {
                    htmlToReturn += Calendar.getSingleCelestialHTML(calendar, year, month, day, celestial, celestialIndex);
                });
                htmlToReturn += "</div>";

                return  htmlToReturn;
            },
            getCelestialHtmlForModal(calendar,year,month,day){

                var htmlToReturn = '<div class="modal-celestials">';
                htmlToReturn += '<label id="modal-subtitle" class="form-label">Celestials</label>';
                jQuery.each($(calendar.metadata.celestials), function( celestialIndex, celestial ) {
                    htmlToReturn += '<div class="row celestial-wrapper">';
                    htmlToReturn += '	<div class="col-md-12 celestial-modal-view">';
                    htmlToReturn += 	Calendar.getSingleCelestialHTML(calendar, year, month, day, celestial, celestialIndex, true);
                    htmlToReturn += '	</div>';
                    htmlToReturn += '</div>';
                });
                htmlToReturn += "</div>";

                return  htmlToReturn;
            },
            buildEventsReorderList(calendar){
                if(calendarPageMode == "presentation"){return;}
                $('#reorderNotes')[0].innerHTML = '<p class="form-control-description">Please save before attempting to reorder events.</p>';
                $("#reorderNotes")[0].setAttribute("skipSave","true");
            },
            refreshEditorMonthList(calendar){
                $("#select-event-month")[0].innerHTML = '';
                (calendar.metadata.months).forEach(function(month,index) {
                    $("#select-event-month")[0].innerHTML += ('<option value="' + index + '">' + month.name + '</option>');
                });
            }
        }

        Calendar.init();

        function buildWeekdayObjectConfigLI(i,val){
            var InputText ="";
            InputText += '<li class="list-group-item day">';
            InputText += '	<button type="button" class="delete-item close" aria-label="Close">';
            InputText += '		<span aria-hidden="true">&times;</span>';
            InputText += '	</button>';
            InputText += '	<h4>Weekday Info</h4>';
            InputText += '	<div class="row">';
            InputText += '		<div class="col-md-12">';
            InputText += '			<b>Weekday Name</b> ';
            InputText += '			<input placeholder="Day Name" class="day-input form-control"  size="30" value="' + (val ? val : "") + '">';
            InputText += '		</div>';
            InputText += '	</div>';
            InputText += '</li>';
            return InputText;
        }

        function buildMonthObjectConfigLI(i,val){
            console.log('Getting server url: ', serverURL);
            var InputText ="";
            InputText += '<li class="list-group-item month">';
            InputText += '	<button type="button" class="delete-item close" aria-label="Close">';
            InputText += '		<span aria-hidden="true">&times;</span>';
            InputText += '	</button>';
            InputText += '	<h4>Month Info</h4>';
            InputText += '	<div class="row">';
            InputText += '		<div class="col-md-8">';
            InputText += '			<b>Month  Name</b> ';
            InputText += '			<input class="month-name-input form-control" placeholder="Month Name" size="30" value="' + (val.name ? val.name : "") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-4">';
            InputText += '			<b>Length</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="How many days are in the month"><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="month-cycle-input form-control" placeholder="10" size="30" value="' + (val.length ? val.length : "") + '">';
            InputText += '		</div>';
            InputText += '	</div>';
            InputText += '	<b>Description</b> ';
            InputText += '	<textarea class="month-desc-input mention form-control" placeholder="Month Description (Supports BBCode!)">' + (val.desc ? val.desc : "") + '</textarea>'
            InputText += '</li>';
            return InputText;
        }

        function buildCelestialObjectInputLI(i,val){
            var InputText ="";
            InputText += '<li id ="listed-celestial-' + i + '" class="list-group-item celestial" my-celestial=' + i + ' >';
            InputText += '	<button type="button" class="delete-item close" aria-label="Close">';
            InputText += '		<span aria-hidden="true">&times;</span>';
            InputText += '	</button>';
            InputText += '	<h4>Celestial Object Info</h4>';
            InputText += '	<div class="row">';
            InputText += '		<div class="col-md-6">';
            InputText += '			<b>Object Name</b> ';
            InputText += '			<input class="celestial-name-input form-control" placeholder="Celestial Body Name" size="30" value="'+ (val.name ? val.name : "") +'">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-3">';
            InputText += '			<b>Cycle</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="The count of days between each New Moon."><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="celestial-cycle-input form-control" placeholder="10" size="5" value="' + (val.cycle ? val.cycle : "") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-3">';
            InputText += '			<b>Shift</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="The offset of the New Moon from first the first of the calendar"><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="celestial-shift-input form-control" placeholder="0" size="5" value="' + (val.shift ? val.shift : "") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-4">';
            InputText += '			<b>Icon</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="The fontawesome icon for the object as will appear on the presentation of the calendar"><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="celestial-icon-input form-control" placeholder="fas fa-circle" size="5" value="' + (val.icon ? val.icon : "fas fa-moon") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-4">';
            InputText += '			<b>Color</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="The hex code or color of the object as will appear on the presentation of the calendar"><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="celestial-color-input form-control" placeholder="#bbbbbb" size="5" value="' + (val.color ? val.color : "grey") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-4">';
            InputText += '			<b>Classes</b> ';
            InputText += '			<span data-tooltip-content="#tooltip_explorer" title="Classes added here will be added to the button for the celestial object during render"><a href="#" class="fas fa-question-circle"></span></a>';
            InputText += '			<input class="celestial-classes-input form-control" placeholder="" size="5" value="'+ (val.classes ? val.classes : "") + '">';
            InputText += '		</div>';
            InputText += '		<div class="col-md-12">';
            InputText += '			<b>Description</b> ';
            InputText += '			<textarea class="celestial-desc-input mention form-control" placeholder="Celestial Object Description">'+ (val.desc ? val.desc : "") + '</textarea>'
            InputText += '		</div>';
            /*
            InputText += '		<div class="col-md-6">';
            InputText += '			<b>Phases to Show</b> ';
            InputText += '			<label>The below changes how the phases of the celestial render on the calendar. Safe and refresh to see the updated</label><br>';
            InputText += '			<select class="form-control celestial-render-type">';
            InputText += '				<option value="full-intermediary" ' + (val.rendertype == "full-intermediary"? "selected" : "") + '>Show all phases as well as the intermediary ones</option>';
            InputText += '				<option value="no-intermediary" ' + (val.rendertype == "no-intermediary"? "selected" : "") + '>Show every major phase, but none of the intermediary steps</option>';
            InputText += '				<option value="only-major"' + (val.rendertype == "only-major"? "selected" : "") + '>Show only the full and new phases</option>';
            InputText += '			</select>';
            InputText += '		</div>';
            *///TODO: Allow Toggling of Phase Appearance Right Here
            InputText += '	</div>';
            InputText += '	<hr>';
            InputText += '	<h4>Object Phases</h4>';
            InputText += '	<label>Clicking any Event or Celestial from the presentation view brings up more information on the Celestial, including its current phase. You can override the names of the Celestial Phases using the below inputs. Phases do not show if your Cycle is 0.</label><br>';
            InputText += '	<div class="row">';
            InputText += '		<div class="col-md-12">';
            InputText += '			<table class="table">';
            InputText += '				<thead><th>Phase</th><th class="text-center">Alias</th></thead>';
            InputText += '				<tbody>'
            InputText += '					<tr >';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(0deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-new" phase="new" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.new : "New") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(36deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-young" phase="young" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.young : "Young") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(72deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waxing-crescent" phase="waxing-crescent" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waxingCrescent : "Waxing Crescent") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(108deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waxing-quarter" phase="waxing-quarter" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waxingQuarter : "Waxing Quarter") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(144deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waxing-gibbous" phase="waxing-gibbous" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waxingGibbous : "Waxing Gibbous") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(180deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-full" phase="full" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.full : "Full") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon-flip" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(144deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waning-gibbous" phase="waning-gibbous" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waningGibbous : "Waning Gibbous") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon-flip" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(108deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waning-quarter" phase="waning-quarter" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waningQuarter : "Waning Quarter") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon-flip" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(72deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-waning-crescent" phase="waning-crescent" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.waningCrescent : "Waning Crescent") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '					<tr>';
            InputText += '						<td class="celestial-config-viewer" style="margin:10px;">';
            InputText += '							<div class="moon-flip" style="--scale-lightgray:'+ (val.color ? val.color : "grey") +'" >';
            InputText += '								<div class="disc" style="transform: rotateY(36deg);"></div>';
            InputText += '							</div>';
            InputText += '						</td>';
            InputText += '						<td style="border-top:none;" ><input class="form-control phase-old" phase="old" placeholder="0" size="20" value="' + (val.phaseNames ? val.phaseNames.old : "Old") + '"></input></td>';
            InputText += '					</tr>';
            InputText += '				</tbody>'
            InputText += '			</table>';
            InputText += '		</div>';
            InputText += '		<div class="col-md-6">';
            InputText += '		</div>';
            InputText += '	</div>';
            InputText += '</li>';
            return InputText;
        }

        function yearSinceZero(yearOffset){

            //Calculate difference between current year and the first year of this calendar

            //Assuming we are *on* year 3: on a startAtOne calendar we're 2 years and change from start; on a startAtZero we are 3 years and change from start.
            //Ergo at startAtZero we do not change the current year for the sake of math, but for startAtOne we lower it by 1.
            //Assuming we are *on* a negative year, we just use the absolute value because either way we are that far from 0
            if(calendarData.metadata.startAtZero == false && yearOffset > 0){
                yearOffset--;
            }
            return Math.abs(yearOffset);
        }

        function dateOrdinal(d) {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
                case 1:  return "st";
                case 2:  return "nd";
                case 3:  return "rd";
                default: return "th";
            }
        }

        $(document).on('click', '#btn-add-new-month', function(event) {
            $("#monthConfig")[0].innerHTML += buildMonthObjectConfigLI($("#monthConfig .month").length, {});
        });
        $(document).on('click', '#btn-add-new-weekday', function(event) {
            $("#daysConfig")[0].innerHTML += buildWeekdayObjectConfigLI($("#daysConfig .day").length, null);
        });
        $(document).on('click', '#btn-add-new-celestial', function(event) {
            $("#celestialsConfig")[0].innerHTML += buildCelestialObjectInputLI($("#celestialsConfig .celestial").length, {});
        });

        $(document).on('click', '.delete-item', function(event) {
            $(this).closest('li').remove();
        });

        $(document).on('click', '.add-tag', function(event) {
            $("#modal-note-tags")[0].value += (" " + this.getAttribute("tagToAdd"));
        });

        $(document).on('click', '.load-note', function(event) {
            event.preventDefault(); // prevent de default action, which is to submit

            var calendarIndex = loadedCalendars.map(function(o) { return o.id; }).indexOf(parseInt(this.getAttribute("calendar-id")));
            var loadedCalendar = loadedCalendars[calendarIndex];
            var noteKey =  this.getAttribute("note");
            var month = (noteKey).split('-')[0];
            var day = (noteKey).split('-')[1];

            if(calendarPageMode == "editor"){

                var arrayKey = this.getAttribute("key");

                var noteValTitle = "";
                // var noteValTitle = " ";
                var noteValText = "";
                var noteValTags = "";
                var noteValDate = "";
                var noteValIcon = "fas fa-book-open";
                var noteValRecurrence = "annual-on-date";

                var noteValDurationPeriod = 1;
                var noteValDurationWrapped = false;
                var noteValIntercalaryActive = false;
                var noteValIntercalaryAfter = false;
                var noteValIntercalaryDistinct = false;
                var noteValIntercalaryNewWeekDuring = false;
                var noteValIntercalaryNewWeekAfter = false;
                var noteValIntercalaryDateAppearance = "normal";

                var noteValbuttonPresentationTitle = "head-body-tail";
                var noteValbuttonPresentationIcon = "head-body-tail";
                var noteValbuttonPresentationTags = "head-body-tail";

                $("#modal-body")[0].setAttribute("arrayKey", arrayKey);
                $("#modal-body")[0].setAttribute("currentlyediting", this.getAttribute("note"));
                $("#modal-body")[0].setAttribute("currentbutton", this.id);
                $("#modal-body")[0].setAttribute("modal-action", this.getAttribute("modal-action"));

                $("#repetition-select").prop('selectedIndex', 0);		//Recurrence Selection

                if(typeof calendarData.metadata.notes.length != "undefined"){
                    var notes = calendarData.metadata.notes;
                    var noteIndex = notes.map(function(o) { return o.key; }).indexOf(arrayKey);
                    if(noteIndex > -1){
                        noteValTitle = notes[noteIndex].title;
                        noteValText = notes[noteIndex].note;
                        noteValTags = notes[noteIndex].tags;
                        noteValIcon = notes[noteIndex].icon;
                        noteValRecurrence = notes[noteIndex].recurrence;
                        noteValDate = calendarData.metadata.months[calendarData.metadata.notes[noteIndex].month].name + " " + calendarData.metadata.notes[noteIndex].day;

                        month = calendarData.metadata.notes[noteIndex].month;
                        day = calendarData.metadata.notes[noteIndex].day;

                        var noteValIntercalaryActive = false;
                        var noteValIntercalaryAfter = false;
                        var noteValIntercalaryDistinct = false;

                        if(notes[noteIndex].duration){
                            noteValDurationPeriod = notes[noteIndex].duration.period;
                            noteValDurationWrapped = notes[noteIndex].duration.isWrapped;
                        }
                        if(notes[noteIndex].intercalary){
                            noteValIntercalaryActive = notes[noteIndex].intercalary.isActive;
                            noteValIntercalaryAfter = notes[noteIndex].intercalary.isAfter;
                            noteValIntercalaryDistinct = notes[noteIndex].intercalary.isDistinct;
                            noteValIntercalaryNewWeekDuring = notes[noteIndex].intercalary.isNewWeekDuring;
                            noteValIntercalaryNewWeekAfter = notes[noteIndex].intercalary.isNewWeekAfter;
                            //noteValIntercalaryDateAppearance = notes[noteIndex].intercalary.dateAppearance;
                        }
                        if(notes[noteIndex].buttonPresentation){
                            noteValbuttonPresentationTitle = notes[noteIndex].buttonPresentation.title;
                            noteValbuttonPresentationIcon = notes[noteIndex].buttonPresentation.icon;
                            noteValbuttonPresentationTags = notes[noteIndex].buttonPresentation.tags;
                        }
                    }
                }

                $("#modal-note-desc")[0].value  = noteValText;
                $("#modal-note-title")[0].value  = noteValTitle;
                $("#modal-note-tags")[0].value  = noteValTags;
                $("#modal-note-icon")[0].value  = (noteValIcon.length > 5? noteValIcon : 'fas fa-book-open');
                $("#repetition-select")[0].value = noteValRecurrence;
                $("#noteIconPreview i").attr("class",noteValIcon);


                $("#eventDuration").val(noteValDurationPeriod);
                $("#toggleMonthWrap")[0].checked = noteValDurationWrapped;
                $("#repetition-select").prop('selectedIndex',$('#repetition-select option[value="' + noteValRecurrence + '"]')[0].index);

                $("#toggleIntercalaryState")[0].checked  = noteValIntercalaryActive;
                $("#toggleIntercalaryAfter")[0].checked  = noteValIntercalaryAfter;
                $("#toggleDisplayDistinct")[0].checked  = noteValIntercalaryDistinct;
                $("#toggleNewWeekDuring")[0].checked  = noteValIntercalaryNewWeekDuring;
                $("#toggleNewWeekAfter")[0].checked  = noteValIntercalaryNewWeekAfter;
                //$("#select-intercalary-date-appearance")[0].value = noteValIntercalaryDateAppearance;

                $("#toggleIntercalaryAfter")[0].disabled = (!noteValIntercalaryActive);
                $("#toggleDisplayDistinct")[0].disabled = (!noteValIntercalaryActive);
                $("#toggleNewWeekDuring")[0].disabled = (!noteValIntercalaryActive);
                $("#toggleNewWeekAfter")[0].disabled = (!noteValIntercalaryActive);
                //$("#select-intercalary-date-appearance")[0].disabled = (!noteValIntercalaryActive);

                $("#select-title-appearance")[0].value = noteValbuttonPresentationTitle;
                $("#select-icon-appearance")[0].value = noteValbuttonPresentationIcon;
                $("#select-tags-appearance")[0].value = noteValbuttonPresentationTags;
                $("#select-event-month")[0].selectedIndex = month;
                $("#select-event-day")[0].value = day;

                if($("#modal-reader .mention-buttons").length == 0){
                    bindmention();
                }
            }
            else if(calendarPageMode == "presentation"){
                var noteKey = this.getAttribute("note");
                var arrayKey = this.getAttribute("key");
                var year = this.getAttribute("yearoffset");
                var noteValText = " ";
                var noteValTitle = " ";

                var monthName = loadedCalendar.metadata.months[month].name;


                //Determine the correct loaded calendar, see if it has notes, see if we can find the note, and load it
                if(typeof loadedCalendar.metadata.notes.length != "undefined"){
                    var notes = loadedCalendar.metadata.notes;
                    var noteIndex = notes.map(function(o) { return o.key; }).indexOf(arrayKey);
                    if(noteIndex > -1){
                        noteValText = notes[noteIndex].note;
                        noteValTitle = notes[noteIndex].title;
                    }
                }

                //Set some placeholders
                $("#modal-note-desc")[0].innerHTML  = '<div class="d-flex justify-content-center"><div class="spinner-border" role="status"><span class="sr-only">Loading...</span></div></div>'
                $("#modal-center-title")[0].innerHTML  = noteValTitle;
                $("#modal-subtitle")[0].innerHTML  = monthName + " the " + day + dateOrdinal(Number(day));
                $("#modal-footer")[0].innerHTML  = Calendar.getCelestialHtmlForModal(loadedCalendar,loadedCalendar.offset,month,day);
                $.ajax({
                    url: getBaseURL() + "/api/parser",
                    method: "POST",
                    dataType: "json",
                    data: {'string': noteValText},
                    async: true,
                    success: function(data) {	$("#modal-note-desc")[0].innerHTML = data.data; 	}
                });
            }
        });

        $(document).on('click', '.load-celestial', function(event) {
            var noteKey = this.getAttribute("note");
            var calendarIndex = loadedCalendars.map(function(o) { return o.id; }).indexOf(parseInt(this.getAttribute("calendar-index")));
            var loadedCalendar = loadedCalendars[calendarIndex];
            var month = loadedCalendar.metadata.months[(noteKey).split('-')[0]].name;
            var day = "" + Number((noteKey).split('-')[1]) + dateOrdinal(Number((noteKey).split('-')[1]));

            $("#modal-center-title")[0].innerHTML = $(loadedCalendar.metadata.celestials)[this.getAttribute("celestial-index")].name;
            $("#modal-subtitle")[0].innerHTML  = month + " the " + day;
            renderBBCodeToTarget($(loadedCalendar.metadata.celestials)[this.getAttribute("celestial-index")].desc,$("#modal-note-desc"));
            $("#modal-footer")[0].innerHTML  = Calendar.getCelestialHtmlForModal(loadedCalendar,loadedCalendar.offset,month,day);
        });

        $(document).on('click', '.note-save', function(event) {
            event.preventDefault(); // prevent de default action, which is to submit

            var notes = calendarData.metadata.notes;
            var noteTitleText = $("#modal-note-title")[0].value;
            var noteValText = $("#modal-note-desc")[0].value;
            var noteValTags = $("#modal-note-tags")[0].value;
            var noteValIcon = ($("#modal-note-icon")[0].value.length > 5? $("#modal-note-icon")[0].value : 'fas fa-book-open');
            var noteValRecurrence = $("#repetition-select")[0].value;
            var arrayKey = $("#modal-body")[0].getAttribute("arrayKey");
            //var noteKey = $("#modal-body")[0].getAttribute("currentlyediting");
            var btnKey = $("#modal-body")[0].getAttribute("currentbutton");
            var modalAction = $("#modal-body")[0].getAttribute("modal-action");

            var eventDuration = ($("#eventDuration").val() ? $("#eventDuration").val()  : 1);
            var eventWrap = $("#toggleMonthWrap")[0].checked;

            var intercalaryActive = $("#toggleIntercalaryState")[0].checked;
            var intercalaryPosition = $("#toggleIntercalaryAfter")[0].checked;
            var intercalaryDistinct = $("#toggleDisplayDistinct")[0].checked;
            var intercalaryNewWeekDuring = $("#toggleNewWeekDuring")[0].checked;
            var intercalaryNewWeekAfter = $("#toggleNewWeekAfter")[0].checked;
            //var intercalaryDateAppearance = $("#select-intercalary-date-appearance")[0].value;

            //Set the calendar text to reflect the title and tags, and save the notes
            var month = $("#select-event-month")[0].selectedIndex;
            var day = $("#select-event-day")[0].value;
            var subtitle = noteTitleText.toLowerCase().replace(/ |,|'|-|%|&/g, "").substring(0,4);

            arrayKey = (arrayKey == "null" ? (month + '-' + day + "-" + (noteValIcon ? noteValIcon.split("-").slice(-1)[0] : "empty") + '-' + (noteTitleText && noteTitleText.trim().length > 1 ? noteTitleText.toLowerCase().replace(/[^a-z0-9]+/gi,""):"empty")):arrayKey);

            var noteObj = {
                date:month + '-' + day,
                month:month,
                day:day,
                title:noteTitleText,
                note:noteValText,
                tags:noteValTags,
                icon:noteValIcon,
                duration:{period:eventDuration,isWrapped:eventWrap},
                intercalary:{
                    isActive:intercalaryActive,
                    isAfter:intercalaryPosition,
                    isDistinct:intercalaryDistinct,
                    isNewWeekDuring:intercalaryNewWeekDuring,
                    isNewWeekAfter:intercalaryNewWeekAfter,
                    //dateAppearance:intercalaryDateAppearance
                },
                recurrence:noteValRecurrence,
                buttonPresentation:{
                    title:$("#select-title-appearance")[0].value,
                    icon:$("#select-icon-appearance")[0].value,
                    tags:$("#select-tags-appearance")[0].value
                },
                key:arrayKey};

            if(typeof notes.length != "undefined"){

                var noteIndex = notes.map(function(o) { return o.key; }).indexOf(arrayKey);					//Find where the note is in the array

                if(noteIndex > -1){																			//If the note exists in the array
                    if(noteTitleText.length > 0 || noteValText.length > 0){			//The note needs to be edited
                        notes[noteIndex] = noteObj;
                    }
                }else{notes.push(noteObj);}															//Otherwise we need to push the note into the array

            }
            else{	//This is the first note and the array needs to be made.
                if(noteValText.length > 0){
                    notes = ([noteObj]);
                }
            }
            $("#modal-body")[0].setAttribute("currentbutton",null);
            calendarData.metadata.notes = notes;
            Calendar.renderPreview(calendarData);

        });

        $(document).on('click', '#toggleIntercalaryState', function(event) {

            $("#toggleIntercalaryAfter")[0].disabled = (!$("#toggleIntercalaryState")[0].checked);
            $("#toggleDisplayDistinct")[0].disabled = (!$("#toggleIntercalaryState")[0].checked);
            $("#toggleNewWeekDuring")[0].disabled = (!$("#toggleIntercalaryState")[0].checked);
            $("#toggleNewWeekAfter")[0].disabled = (!$("#toggleIntercalaryState")[0].checked);
            //$("#select-intercalary-date-appearance")[0].disabled = (!$("#toggleIntercalaryState")[0].checked);

            if(!$("#toggleIntercalaryState")[0].checked){
                $("#toggleIntercalaryAfter")[0].checked = false;
                $("#toggleDisplayDistinct")[0].checked = false;
                $("#toggleNewWeekDuring")[0].checked = false;
                $("#toggleNewWeekAfter")[0].checked = false;
                //$("#select-intercalary-date-appearance")[0].value = "normal";
            }
        });

        $(document).on('click', '.note-delete', function(event) {
            event.preventDefault(); // prevent de default action, which is to submit
            var noteKey = $("#modal-body")[0].getAttribute("currentlyediting");
            var currentButton = $("#modal-body")[0].getAttribute("currentbutton");
            var arrayKey = $("#modal-body")[0].getAttribute("arraykey");

            if(typeof calendarData.metadata.notes.length != "undefined"){

                var noteIndex = calendarData.metadata.notes.map(function(o) { return o.key; }).indexOf(arrayKey);
                calendarData.metadata.notes.splice(noteIndex,1);

                //Clean out all the text
                $("#modal-note-title")[0].value = "";
                $("#modal-note-desc")[0].value = "";
                $("#modal-note-tags")[0].value = "";
            }
            Calendar.renderPreview(calendarData);
        });

        $(document).on('click', '.import-save', function(event) {

            if($('#calendar-json-in')[0].value.length <= 5){
                return;
            }

            calendarData.metadata = JSON.parse($('#calendar-json-in')[0].value);
            calendarData.metadata = (calendarData.metadata.name? calendarData.metadata : JSON.parse(calendarData.metadata)); //Legacy patch for twice-stringified metadatas
            calendarData.title = calendarData.metadata.name;
            calendarData.months = calendarData.metadata.months.map(x => x.name);
            calendarData.metadata = $('#calendar-json-in')[0].value;
            Calendar.save(calendarData);
        });

        $(document).on('click', '.calendar-save', function(event) {
            event.preventDefault(); // prevent de default action, which is to submit
            console.log('Calendar Save Triggered...');

            calendarData.metadata.calendarVersion = "0.8.3";

            console.log("Saving Days");
            var metaDataDays = [];
            jQuery.each($("#daysConfig .day"), function( i, val ) {
                metaDataDays.push($(val).find(".day-input")[0].value);
            });
            if(metaDataDays.length == 0){
                window.alert("You must add weekdays before saving. Weekdays determine how many columns wide the calendar is. If you do not wish to show weekdays, there's an option to disable it within the dropdown.");
                return;
            }

            console.log("Saving Months");
            var metaDataMonths = [];
            jQuery.each($("#monthConfig .month"), function( i, val ) {
                metaDataMonths.push({
                    name:$(val).find(".month-name-input")[0].value,
                    length:$(val).find(".month-cycle-input")[0].value,
                    desc:$(val).find(".month-desc-input")[0].value,
                    reset:$($("#monthResetToggle")[0]).prop("checked")
                });
            });

            console.log("Saving Celestials");
            var metaDataCelestials = [];
            jQuery.each($(".celestial-objects .celestial"), function( i, val ) {
                metaDataCelestials.push({
                    name:$(val).find(".celestial-name-input")[0].value,
                    cycle:$(val).find(".celestial-cycle-input")[0].value,
                    shift:$(val).find(".celestial-shift-input")[0].value,
                    icon:$(val).find(".celestial-icon-input")[0].value,
                    color:$(val).find(".celestial-color-input")[0].value,
                    classes:$(val).find(".celestial-classes-input")[0].value,
                    desc:$(val).find(".celestial-desc-input")[0].value,
                    //rendertype:$(val).find(".celestial-render-type")[0].value, //TODO: Save the rendertype of the celestial
                    phaseNames:{
                        new:$(val).find(".phase-new")[0].value,
                        young:$(val).find(".phase-young")[0].value,
                        waxingCrescent:$(val).find(".phase-waxing-crescent")[0].value,
                        waxingQuarter:$(val).find(".phase-waxing-quarter")[0].value,
                        waxingGibbous:$(val).find(".phase-waxing-gibbous")[0].value,
                        full:$(val).find(".phase-full")[0].value,
                        waningGibbous:$(val).find(".phase-waning-gibbous")[0].value,
                        waningQuarter :$(val).find(".phase-waning-quarter")[0].value,
                        waningCrescent:$(val).find(".phase-waning-crescent")[0].value,
                        old:$(val).find(".phase-old")[0].value
                    },
                    showphases:($(val).find(".celestial-cycle-input")[0].value > 0 ? true : false)
                });
            });


            calendarData.title = $('#calendar_name')[0].value;
            calendarData.metadata.name = $('#calendar_name')[0].value;
            calendarData.metadata.description = $('#calendar-description')[0].value;

            calendarData.metadata.monthOffset = $('#calendar_monthOffset')[0].value;

            /*Years*/
            calendarData.metadata.startAtZero = $("#yearZeroToggle")[0].checked;
            calendarData.metadata.defaultYear = $('#calendar_year')[0].value;
            if(calendarData.metadata.startAtZero == false && calendarData.metadata.defaultYear == 0){
                calendarData.metadata.defaultYear = 1;
            }

            /*Days*/
            calendarData.metadata.showDays = $("#monthHeaderToggle")[0].checked;
            calendarData.metadata.days = metaDataDays;
            calendarData.metadata.daysPerWeek = metaDataDays.length;

            /*Months*/
            calendarData.months = metaDataMonths.map(x=> x.name);
            calendarData.metadata.months = metaDataMonths;
            calendarData.metadata.monthsPerYear = metaDataMonths.length;

            /*Celestials*/
            calendarData.metadata.celestials = metaDataCelestials;
            calendarData.metadata.celestialBodyCount = metaDataCelestials.length;

            /*Notes*/
            if($("#reorderNotes")[0] && $("#reorderNotes")[0].getAttribute("skipSave") == "false"){
                var reorderedNotes = [];
                jQuery.each($(".events-reordering li"), function( i , sortable) {
                    reorderedNotes.push(calendarData.metadata.notes[sortable.getAttribute("notekey")]);
                });
                calendarData.metadata.notes = reorderedNotes;
            }
            calendarData.notes = calendarData.metadata.notes;


            calendarData.metadata = JSON.stringify(calendarData.metadata);

            Calendar.save(calendarData);
        });

        $(document).on('change', '#modal-note-icon', function(event) {
            $("#noteIconPreview i").attr("class",$("#modal-note-icon").val());
        });

        function renderBBCodeToTarget(bbcode, target){
            if($(target)[0]){
                $.ajax({
                    url: getBaseURL() + "/api/parser",
                    method: "POST",
                    dataType: "json",
                    data: {'string': bbcode},
                    async: true,
                    success: function(data) {
                        $(target)[0].innerHTML = data.data;
                    }
                });
            }
        }
    }
});