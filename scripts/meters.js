(function () {
    'use sctrict';
    // meters.js, by Chapel; for SugarCube 2
    // v1.0.0

    var options = {
        tryGlobal : true, // attempt to send `Meter` to the global scope?
        allowClobbering : false, // allow a new meter to replace a previously defined meter with the same name instead of throwing
        IAmAGrownUp : false // make sure you have enough rope to hang yourself
    };


    var defaultSettings = {
        full : '#2ECC40', // color when the bar is full
        empty : '#FF4136', // color when the bar is empty
        back : '#DDDDDD', // color of the backing
        height : '12px', // height of the bar
        width : '180px', // width of the bar
        animate : 400, // ms
        easing : 'swing', // animation easing
        text : '#111111', // label text color
        label : '', // label text
        align : 'center' // label alignment
    };

    var _validAlignments = ['center', 'left', 'right'];
    var _validEasing = ['swing', 'linear'];

    function _handleString (str, def) {
        if (str && typeof str === 'string') {
            str = str.toLowerCase().trim();
            if (str) {
                return str;
            }
            return def || '';
        }
        return def || '';
    }

    function Meter (opts, value) {
        if (!(this instanceof Meter)) {
            return new Meter(opts, value);
        }
        this.settings = Object.assign(defaultSettings, opts);

        // default malformed settings

        this.settings.align = _handleString(this.settings.align);
        this.settings.easing = _handleString(this.settings.easing);

        if (!_validAlignments.includes(this.settings.align)) {
            this.settings.align = 'center';
        }

        if (!_validEasing.includes(this.settings.easing)) {
            this.settings.easing = 'swing';
        }

        // set the value, or default to 1

        value = Number(value);
        if (Number.isNaN(value)) {
            value = 1;
        }
        value = Math.clamp(value, 0, 1);
        this.value = value;

        // the backing of the meter, and the container
        var $wrapper = $(document.createElement('div'))
            .addClass('chapel-meter')
            .attr({
                'data-val' : value,
                'data-label' : this.settings.label
            })
            .css({
                'background-color' : this.settings.back,
                'height' : this.settings.height,
                'width' : this.settings.width,
                'overflow' : 'hidden'
            });

        // the meter's label
        var $label = $(document.createElement('div'))
            .addClass('meter-label')
            .css({
                'font-size' : this.settings.height,
                'font-weight' : 'bold',
                'line-height' : '100%',
                'width' : this.settings.width,
                'text-align' : this.settings.align,
                'color' : this.settings.text,
                'z-index' : 1,
                'position' : 'relative',
                'bottom' : '100%'
            })
            .wiki(this.settings.label);

        // this is just here to give the bar a smooth transitioning coloration
        var $barTop = $(document.createElement('div'))
            .addClass('meter-top')
            .css({
                'background-color' : this.settings.full,
                'opacity' : this.value,
                'width' : '100%',
                'height' : '100%',
                'z-index' : 0
            });

        // this actually holds the value and the 'real' bar color
        var $barBottom = $(document.createElement('div'))
            .addClass('meter-bottom')
            .css({
                'background-color' : this.settings.empty,
                'opacity' : 1,
                'width' : (this.value * 100) + '%',
                'height' : '100%'
            })
            .append($barTop, $label)
            .appendTo($wrapper);

        this.$element = $wrapper;
        this.$bars = { // undocumented
            top : $barTop,
            bottom : $barBottom
        };
        this.$label = $label; // undocumented

        // mostly a reminder
        $label.css('font-size', $wrapper.height());
    }

    Object.assign(Meter, {
        _list : new Map(), // undocumented; meter data dump
        is : function (thing) { // see if passed "thing" is a meter instance
            return thing instanceof Meter;
        },
        has : function (name) { // does the named meter exist?
            return Meter._list.has(name) && Meter.is(Meter._list.get(name));
        },
        get : function (name) { // return the meter instance
            if (Meter.has(name)) {
                return Meter._list.get(name);
            }
            return null;
        },
        del : function (name) { // delete the meter with the indicated name
            if (Meter.has(name)) {
                Meter._list.delete(name);
            }
        },
        add : function (name, opts, value) { // add a new meter; the constructor should not be used
            if (Meter.has(name) && !options.allowClobbering) {
                console.error('Meter "' + name + '" already exists.');
                return;
            }
            var meter = new Meter(opts, value);
            Meter.set(name, meter);
            return meter;
        },
        _emit : function (inst, name) { // undocumented; emit an event on the given meter
            if (!Meter.is(inst)) {
                return;
            }
            inst.$element.trigger({
                type : ':' + name,
                meter : inst
            });
        }
    });

    Object.assign(Meter.prototype, {
        constructor : Meter,
        _label : function () { // undocumented; reprocess the meter label and set the font size
            this.$label.empty().wiki(this.settings.label);
            this.$label.css('font-size', this.$element.height());
            return this;
        },
        _width : function () { // undocumented; change the meter width
            var self = this;
            this.$bars.bottom.animate({
                'width' : (this.value * 100) + '%'
            }, this.settings.animate, this.settings.easing, function () {
                Meter._emit(self, 'meter-animation-complete');
            });
            return this;
        },
        _color : function () { // undocumented; blend the full and empty meter colors
            this.$bars.top.animate({
                'opacity' : this.value
            }, this.settings.animate, this.settings.easing);
            return this;
        },
        animate : function () { // animate bar changes
            Meter._emit(this, 'meter-animation-start');
            return this._color()._width()._label();
        },
        val : function (n) { // set and get bar value
            if (n !== undefined) {
                n = Number(n);
                if (Number.isNaN(n)) {
                    n = 1;
                }
                n = Math.clamp(n, 0, 1);

                this.value = n;
                this.animate();
            }
            return this.value;
        },
        settings : function (opts) {
            // set or get bar settings
            if (opts && typeof opts === 'object') {
                Object.assign(this.settings, opts);
            }
            return this.settings;
        },
        unwrap : function () {
            // return unwrapped container element
            return this.$element[0];
        },
        place : function ($target, options) { // put the bar in a known element, with a wrapper
            var $wrapper = $(document.createElement('span'));
            if (!($target instanceof jQuery)) {
                $target = $($target);
            }
            if (!$target[0]) {
                console.warn('meter#place() -> no valid target');
            }
            if (options && typeof options === 'object') {
                // options can contain classes or attributes for the wrapper
                if (options.classes && (Array.isArray(options.classes) || typeof options.classes === 'string')) {
                    $wrapper.addClass(options.classes);
                }
                if (options.attr && typeof options.attr === 'object') {
                    $wrapper.attr(options.attr);
                }
            }
            $target.append($wrapper.append(this.$element));
            // make sure to process the label
            this._label();
            return this;
        },
        // event methods for meters
        on : function (eventType, cb) {
            if (typeof cb !== 'function') {
                return this;
            }
            if (!eventType || typeof eventType !== 'string' || !eventType.trim()) {
                return this;
            }
            eventType = eventType.split(' ').map( function (type) {
                type = type.split('.')[0];
                return type + '.userland';
            }).join(' ');
            this.$element.on(eventType, cb.call(null, ev));
            return this;
        },
        one : function (eventType, cb) {
            if (typeof cb !== 'function') {
                return this;
            }
            if (!eventType || typeof eventType !== 'string' || !eventType.trim()) {
                return this;
            }
            eventType = eventType.split(' ').map( function (type) {
                type = type.split('.')[0];
                return type + '.userland';
            }).join(' ');
            this.$element.one(eventType + '.userland', cb.call(null, ev));
            return this;
        },
        off : function (eventType) {
            if (eventType && typeof eventType === 'string' && eventType.trim()) {
                eventType = eventType.split(' ').map( function (type) {
                    type = type.split('.')[0];
                    return type + '.userland';
                }).join(' ');
            } else {
                eventType = '.userland';
            }
            this.$element.off(eventType);
        },
        // for completeness and in case a meter winds up in the state
        clone : function () {
            return new Meter(this.settings, this.value);
        },
        toJSON : function () {
            return JSON.reviveWrapper('new setup.Meter(' + JSON.stringify(this.settings) + ', ' + this.value + ')');
        }
    });

    // setup-spaced API
    setup.Meter = Meter;

    if (options.tryGlobal) { // global API, if undefined
        window.Meter = window.Meter || Meter;
    }

    // <<newmeter '$variable' [optional: starting value (between 0 and 1)]>>...<</newmeter>>
    // optional child tags: <<metercolors full [empty] [backing]>>, <<metersizing height [width]>>, <<meteranimation timeOrBool [easing]>>, <<meterlabel labelText [textColor] [alignment]>>
    Macro.add('newmeter', {
        tags : ['metercolors', 'metersizing', 'meteranimation', 'meterlabel'],
        handler : function () {

            if (passage() !== 'StoryInit' && !options.IAmAGrownUp) {
                // you are not a grown up
                return this.error('The `<<newmeter>>` macro must be called in your `StoryInit` special passage. Seriously. No excuses. --Love, Chapel');
            }

            if (this.args.length < 1) {
                return this.error('The `<<newmeter>>` macro requires at least one argument: the variable name to store the meter in.');
            }

            var meterName = this.args[0], 
                colorsTag = null, 
                sizeTag = null, 
                animTag = null,
                labelTag = null;

            if (typeof meterName !== 'string') {
                return this.error('Invalid meter name.');
            }

            meterName = meterName.trim();

            if (Meter.has(meterName) && !options.allowClobbering) {
                return this.error('Cannot clobber the existing meter "' + meterName + '".');
            }

            if (this.payload.length) {
                // get each child tag for processing
                colorsTag = this.payload.find( function (pl) {
                    return pl.name === 'metercolors';
                });
                sizeTag = this.payload.find( function (pl) {
                    return pl.name === 'metersizing';
                });
                animTag = this.payload.find( function (pl) {
                    return pl.name === 'meteranimation';
                });
                labelTag = this.payload.find( function (pl) {
                    return pl.name === 'meterlabel';
                });
            }

            var options = {};

            if (colorsTag) {
                // process the colors tag
                if (!colorsTag.args.length) {
                    return this.error('No arguments passed to the `<<metercolors>>` tag.');
                }

                switch (colorsTag.args.length) {
                    case 1:
                        options.empty = colorsTag.args[0];
                        options.full = 'transparent'; // make the meter one solid color
                        break;
                    case 2:
                        options.full = colorsTag.args[0];
                        options.empty = colorsTag.args[1];
                        break;
                    default:
                        options.full = colorsTag.args[0];
                        options.empty = colorsTag.args[1];
                        options.back = colorsTag.args[3];
                }
            }

            if (sizeTag) {
                // process the sizin tag
                if (!sizeTag.args.length) {
                    return this.error('No arguments passed to the `<<metercolors>>` tag.');
                }

                options.width = sizeTag.args[0];

                if (sizeTag.args[1]) {
                    options.height = sizeTag.args[1];
                }

            }

            if (animTag) {
                // process the animations tag
                if (!animTag.args.length) {
                    return this.error('No arguments passed to the `<<meteranimation>>` tag.');
                }

                if (typeof animTag.args[0] === 'boolean' && !animTag.args[0]) {
                    options.animate = 0; // functionally no animation--we still want the event, though, so we'll just 0 it out
                } else if (typeof animTag.args[0] === 'string') {
                    options.animate = Util.fromCssTime(animTag.args[0]);
                } else {
                    return this.error('The argument to the `<<meteranimation>>` tag should be `true`, `false`, or a valid CSS time value.');
                }

                if (animTag.args[1] && ['swing', 'linear'].includes(animTag.args[1])) {
                    options.easing = animTag.args[1];
                }
            }

            if (labelTag) {
                // process the label tag
                var text = labelTag.args[0];
                if (text && typeof text === 'string') {
                    options.label = text.trim();
                } else {
                   return this.error('The labelText argument for the `<<meterlabel>>` tag is required.');
                }

                if (labelTag.args[1] && typeof labelTag.args[1] === 'string') {
                    options.text = labelTag.args[1];
                }
                if (labelTag.args[2] && typeof labelTag.args[2] === 'string') {
                    options.align = labelTag.args[2];
                }
            }

            Meter.add(meterName, options, this.args[1]);

        }
    });

    // <<showmeter '$variable' [value]>>
    Macro.add('showmeter', {
        handler : function () {

            if (this.args.length < 1) {
                return this.error('This macro requires at least one argument: the meter\'s name.');
            }

            // get the meter
            var meterName = this.args[0];

            if (typeof meterName !== 'string') {
                return this.error('Invalid meter name.');
            }

            meterName = meterName.trim();

            var meter = Meter.get(meterName);

            if (!meter || !Meter.is(meter)) {
                return this.error('The meter "' + meterName + '" does not exist.');
            }

            // set the meter, if necessary
            if (typeof this.args[1] === 'number') {
                meter.val(this.args[1]);
            }

            // render the meter
            meter.place(this.output, {
                classes : 'macro-' + this.name,
                attr : { id : 'meter-' + Util.slugify(varName) }
            });

        }
    });

    // <<updatebar '$variable' value>>
    Macro.add('updatemeter', {
        handler : function () {

            if (this.args.length < 2) {
                return this.error('This macro requires two arguments: the meter\'s name and a value.');
            }

            // get the meter
            var meterName = this.args[0];

            if (typeof meterName !== 'string') {
                return this.error('Invalid meter name.');
            }

            meterName = meterName.trim();

            var meter = Meter.get(meterName);

            if (!meter || !Meter.is(meter)) {
                return this.error('The meter "' + meterName + '" does not exist.');
            }

            // set it
            meter.val(this.args[1]); // if it's on the page, should update and animate auto-magically.

        }
    });

}());