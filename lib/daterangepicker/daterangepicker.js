/*
 * daterangepicker.js, renders lightweight date rangepicker.
 *
 * Dependencies: jQuery, underscore.js, moment.js
 *
 * License: MIT
**/
(function(root, factory){
    'use strict';

    // Full MicroEvents library @ 54e85c036c3f903b963a0e4a671f72c1089ae4d4
    // (added some missing semi-colons etc, that's it)
    /**
     * MicroEvent - to make any js object an event emitter (server or browser)
     *
     * - pure javascript - server compatible, browser compatible
     * - dont rely on the browser doms
     * - super simple - you get it immediatly, no mistery, no magic involved
     *
     * - create a MicroEventDebug with goodies to debug
     *   - make it safer to use
    */

    var MicroEvent  = function(){};
    MicroEvent.prototype    = {
        bind    : function(event, fct){
            this._events = this._events || {};
            this._events[event] = this._events[event]   || [];
            this._events[event].push(fct);
        },
        unbind  : function(event, fct){
            this._events = this._events || {};
            if( event in this._events === false  ) { return; }
            this._events[event].splice(this._events[event].indexOf(fct), 1);
        },
        trigger : function(event /* , args... */){
            this._events = this._events || {};
            if( event in this._events === false  ) { return; }
            for(var i = 0; i < this._events[event].length; i++){
                this._events[event][i].apply(this, Array.prototype.slice.call(arguments, 1));
            }
        }
    };

    /**
     * mixin will delegate all MicroEvent.js function in the destination object
     *
     * - require('MicroEvent').mixin(Foobar) will make Foobar able to use MicroEvent
     *
     * @param {Object} the object which will support MicroEvent
    */
    MicroEvent.mixin    = function(destObject){
        var props   = ['bind', 'unbind', 'trigger'];
        for(var i = 0; i < props.length; i ++){
            destObject.prototype[props[i]]  = MicroEvent.prototype[props[i]];
        }
    };
    /// END MicroEvents

    // Work with AMD or plain-ol script tag
    if(typeof define === 'function' && define.amd){
        // If window.jQuery or window._ are not defined, then assume we're using AMD modules
        define(['jquery', 'underscore', 'moment'], function($, _, moment){
            return factory($ || root.jQuery, _ || root._, moment || root.moment, MicroEvent);
        });
    }else{
        root.daterangepicker = factory(root.jQuery, root._, root.moment, MicroEvent);
    }

})(this, function($, _, moment, MicroEvent){

    'use strict';

    if(!$){
        throw new Error('daterangepicker requires jQuery to be loaded');
    }
    if(!_){
        throw new Error('daterangepicker requires underscore to be loaded');
    }
    if(!moment){
        throw new Error('daterangepicker requires moment to be loaded');
    }

    function Calendar(options){
        var todayString = moment().format('YYYY-MM-DD');

        options = _.defaults(options, {
            selectedDate: todayString
        });

        var $el = this.$el = $('<div>'),
            className = options.className,
            selectedDate = moment(options.selectedDate),
            monthToDisplay = moment([selectedDate.year(), selectedDate.month()]);

        this.monthToDisplay = monthToDisplay;
        this.selectedDate = moment(selectedDate);

        if(className){
            $el.addClass(className);
        }

        $el.on('click', 'td.day', _.bind(this.onDayClicked, this));
        $el.on('click', 'th.next', _.bind(this.onNextClicked, this));
        $el.on('click', 'th.prev', _.bind(this.onPreviousClicked, this));
    }

    function buildCalendarHtml(data){
        var rowHtml = _(data.rows).map(function(row){
            var columnHtml = _(row.columns).map(function(col){
                return '<td class="day ' + (col.className || '') + '" data-date="' + col.date +'">' + col.dayNumber +'</td>';
            });
            return '<tr class="week">' + columnHtml.join('') + '</tr>';
        });

        return '<table class="calendar">' +
                '<thead>' +
                    '<tr>' +
                        '<th class="prev"><span class="icon-arrow-left"></span></th>' +
                        '<th class="month-title" colspan="5" style="width: auto">' + data.monthTitle + '</th>' +
                        '<th class="next"><span class="icon-arrow-right"></span></th>' +
                    '</tr>' +
                    '<tr>' +
                        '<th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>' +
                    '</tr>' +
                '</thead>' +
                '<tbody>' +
                    rowHtml.join('') +
                '</tbody>' +
            '</table>';
    }

    _.extend(Calendar.prototype, {
        _getStartDate: function(){
            var startDate = this.monthToDisplay.clone();

            if(startDate.day() !== 1){
                startDate.subtract('days', (startDate.day()||7) -1);
            }

            return startDate;
        },

        _findCellByDate: function(date){
            return this.$el.find('.day[data-date="' + date.format('YYYY-MM-DD') + '"]');
        },

        render: function(){
            var rowStartDate = this._getStartDate().subtract('days', 1),
                selectedDate = this.selectedDate,
                monthToDisplayIndex = this.monthToDisplay.month(),
                getClassName = function(date){
                    var classes = [];

                    if(date.month() !== monthToDisplayIndex){
                        classes.push('grey');
                    } else if (date.toString() === selectedDate.toString()){
                        classes.push('selected');
                    }

                    if(classes.length){
                        return classes.join(' ');
                    }
                },
                weeksToShow = this._getStartDate().add('weeks', 6).month() > monthToDisplayIndex ? 5 : 6,
                data = {
                    monthTitle: this.monthToDisplay.format('MMMM YYYY'),
                    rows: _.map(_.range(weeksToShow), function(weekIdx){
                        return {
                            columns: _.map(_.range(7), function(dayIdx){
                                var date = rowStartDate.clone().add('days', (weekIdx * 7) + (dayIdx + 1) );

                                return {
                                    date: date.format('YYYY-MM-DD'),
                                    className: getClassName(date),
                                    dayNumber: date.date()
                                };
                            })
                        };
                    })
                };

            this.$el.html(buildCalendarHtml(data));
        },

        destroy: function(){
            var $el = this.$el;

            $el.off('click', 'td.day');
            $el.off('click', 'th.next');
            $el.off('click', 'th.prev');

            $el.remove();
        },

        onDayClicked: function(e){
            e.stopPropagation();

            var target = $(e.target),
                date = target.data('date');

            this.updateSelectedDate(date);
        },

        onNextClicked: function(e){
            e.stopPropagation();

            var monthToShow = this.monthToDisplay.clone().add('months', 1);
            this.showMonth(monthToShow.year(), monthToShow.month());
        },

        onPreviousClicked: function(e){
            e.stopPropagation();

            var monthToShow = this.monthToDisplay.subtract('months', 1);
            this.showMonth(monthToShow.year(), monthToShow.month());
        },

        updateSelectedDate: function(date){
            var newDate = this.selectedDate = moment(date),
                month = newDate.month(),
                year = newDate.year(),
                monthToDisplay = this.monthToDisplay;

            if(month !== monthToDisplay.month() || year !== monthToDisplay.year()){
                this.showMonth(year, month);
            }

            this.$el.find('.day.selected').removeClass('selected');
            this._findCellByDate(newDate).addClass('selected');

            this.trigger('onDateSelected', { date: date });
        },

        showMonth: function(year, month){
            this.monthToDisplay = moment([year, month, 1]);
            this.render();

            this.trigger('onMonthDisplayed', { month: this.monthToDisplay });
        },

        highlightCells: function(startDate, endDate){
            var startCell = this._findCellByDate(startDate).not('.grey'),
                endCell = this._findCellByDate(endDate).not('.grey'),
                startRow = startCell.parent(),
                endRow = endCell.parent(),
                inRangeClassName = 'inRange',
                daySelector = '.day',
                greySelector = '.grey';

            this.$el.find('.'+inRangeClassName).removeClass(inRangeClassName);

            if(startDate.diff(endDate) === 0){
                return;
            }

            if(this.monthToDisplay.diff(startDate.clone().date(1)) < 0){
                return;
            }

            if(this.monthToDisplay.diff(endDate.clone().date(1)) > 0){
                return;
            }

            if(!startCell.length && !endCell.length){
                //fill all
                this.$el.find(daySelector).not(greySelector).addClass(inRangeClassName);
                return;
            }

            if(!startCell.length){
                //fill from start to endDate
                endCell.parent().prevAll().children(daySelector).not(greySelector).addClass(inRangeClassName);
                endCell.prevAll(daySelector).not(greySelector).addClass(inRangeClassName);
                return;
            }

            if(!endCell.length) {
                //fill from startDate to end
                startCell.parent().nextAll().children(daySelector).not(greySelector).addClass(inRangeClassName);
                startCell.nextAll(daySelector).not(greySelector).addClass(inRangeClassName);
                return;
            }

            //fill from startDate to endDate
            if(startRow.is(endRow)){
                startCell.nextUntil(endCell).addClass(inRangeClassName);
            } else {
                startRow.nextUntil(endRow).children(daySelector).not(greySelector).addClass(inRangeClassName);
                startCell.nextAll(daySelector).not(greySelector).addClass(inRangeClassName);
                endCell.prevAll(daySelector).not(greySelector).addClass(inRangeClassName);
            }

            endCell.addClass(inRangeClassName);
            startCell.addClass(inRangeClassName);
        }
    });

    function DateRangePicker(options){
        var todayString = moment().format('YYYY-MM-DD');

        options = _.defaults(options, {
            startDate: todayString,
            endDate: todayString
        });

        this.$el = $('<div/>');
        this.$el.on('click', '.presets li', _.bind(this.onPresetClick, this));

        this.startCalendar = this._createCalendar({
            selectedDate: options.startDate,
            className: 'startCalendar'
        });

        this.endCalendar = this._createCalendar({
            selectedDate: options.endDate,
            className: 'endCalendar'
        });

        if(options.presets){
            this.presets = options.presets;
            this.$el.addClass('withPresets');
        }

        this.startCalendar.bind('onDateSelected', _.bind(this.onStartDateSelected, this));
        this.startCalendar.bind('onMonthDisplayed', _.bind(this._updateStartCalendarHighlight, this));

        this.endCalendar.bind('onDateSelected', _.bind(this.onEndDateSelected, this));
        this.endCalendar.bind('onMonthDisplayed', _.bind(this._updateEndCalendarHighlight, this));
    }

    DateRangePicker.create = function(options){
        options = options || {};

        var className = options.className,
            picker;

        delete options.className;

        picker = new DateRangePicker(options);

        if(className){
            picker.$el.addClass(className);
        }

        return picker;
    };

    _.extend(DateRangePicker.prototype, {

        _createCalendar: function(month, year, selectedDate, className){
            return new Calendar(month, year, selectedDate, className);
        },

        _updateStartCalendarHighlight: function(){
            this.startCalendar.highlightCells(this.getStartDate(), this.getEndDate());
        },

        _updateEndCalendarHighlight: function(){
            this.endCalendar.highlightCells(this.getStartDate(), this.getEndDate());
        },

        _highlightRange: function(startDate, endDate){
            if(startDate.diff(endDate) > 0){
                return;
            }

            this.startCalendar.highlightCells(startDate, endDate);
            this.endCalendar.highlightCells(startDate, endDate);
        },

        buildPresetsList: function(){
            var presets = this.presets,
                lis;

            if(!presets){
                return;
            }

            lis = _(presets).map(function(val, key){
                return '<li data-startdate="' + val.startDate + '" data-enddate="' + val.endDate + '">' + key + '</li>';
            });

            return '<ul class="presets">' + lis.join('') + '</ul>';
        },

        render: function(){
            var startCalendar = this.startCalendar,
                endCalendar = this.endCalendar,
                presetsList = this.buildPresetsList();

            startCalendar.render();
            endCalendar.render();

            this._updateStartCalendarHighlight();
            this._updateEndCalendarHighlight();

            this.$el.addClass('picker').append(presetsList).append(startCalendar.$el).append(endCalendar.$el);
        },

        show: function($target){
            var $el = this.$el,
                targetOffset = $target.offset(),
                windowWidth = $(window).width(),
                left;

            if( (targetOffset.left + $el.outerWidth()) > windowWidth ){
                left = windowWidth - $el.outerWidth() - 10;
            } else {
                left = targetOffset.left;
            }

            $el.show().css({
                top: targetOffset.top + $target.outerHeight(),
                left: left
            });

            $(document).on('click.daterangepicker', _.bind(this.hide, this));
        },

        hide: function(){
            this.$el.hide();
            $(document).off('click.daterangepicker', this.hide);
        },

        destroy: function(){
            this.startCalendar.destroy();
            this.endCalendar.destroy();

            this.$el.remove();
        },

        getStartDate: function(){
            return this.startCalendar.selectedDate;
        },

        getEndDate: function(){
            return this.endCalendar.selectedDate;
        },

        updateStartCalendarHighlight: function(){
            this.startCalendar.highlightCells(this.getStartDate(), this.getEndDate());
        },

        updateEndCalendarHighlight: function(){
            this.endCalendar.highlightCells(this.getStartDate(), this.getEndDate());
        },

        highlightRange: function(startDate, endDate){
            if(startDate.diff(endDate) > 0){
                return;
            }

            this.startCalendar.highlightCells(startDate, endDate);
            this.endCalendar.highlightCells(startDate, endDate);
        },

        onStartDateSelected: function(args){
            var startDate = moment(args.date),
                endDate = this.getEndDate();

            if(moment(startDate).diff(endDate) > 0){
                this.endCalendar.updateSelectedDate(startDate);
            }

            this._highlightRange(startDate, endDate);

            this.trigger('startDateSelected', {
                startDate: startDate,
                endDate: endDate
            });
        },

        onEndDateSelected: function(args){
            var endDate = moment(args.date),
                startDate = this.getStartDate();

            if(moment(startDate).diff(endDate) > 0){
                this.startCalendar.updateSelectedDate(endDate);
            }

            this._highlightRange(startDate, endDate);

            this.trigger('endDateSelected', {
                startDate: startDate,
                endDate: endDate
            });
        },

        onPresetClick: function(e){
            e.stopPropagation();

            var target = $(e.target),
                startDate = moment(target.data('startdate')),
                endDate = moment(target.data('enddate'));

            this.startCalendar.updateSelectedDate(startDate);
            this.endCalendar.updateSelectedDate(endDate);

            this._updateStartCalendarHighlight();
            this._updateEndCalendarHighlight();

            this.trigger('rangeSelected', {
                startDate: startDate,
                endDate: endDate
            });
        }
    });

    MicroEvent.mixin(Calendar);
    MicroEvent.mixin(DateRangePicker);

    $.fn.daterangepicker = function(options) {

        var updateValue = function(options){
            var startDate = options.startDate,
                endDate = options.endDate,
                formattedValue = startDate.format('DD MMM YYYY') + ' - ' + endDate.format('DD MMM YYYY');

            this.val(formattedValue);
        };

        return this.each(function() {
            var $self = $(this),
                picker = $self.data('picker'),
                boundUpdate = _.bind(updateValue, $self);

            if(!picker){
                picker = DateRangePicker.create(options);
                picker.render();

                picker.bind('startDateSelected', boundUpdate);
                picker.bind('endDateSelected', boundUpdate);
                picker.bind('rangeSelected', boundUpdate);

                $self.data('picker', picker);

                $('body').append(picker.$el.hide());
            }

            $self.on('click', function(e){
                e.stopPropagation();

                picker.show($self);
            });
        });
    };

    return DateRangePicker;
});
