(function(context){
	'use strict';

	//polyfill for matchesSelector
	if(!HTMLElement.prototype.matches) {
		var htmlprot = HTMLElement.prototype;

		htmlprot.matches =
			htmlprot.webkitMatchesSelector ||
			htmlprot.mozMatchesSelector ||
			htmlprot.msMatchesSelector ||
			htmlprot.oMatchesSelector ||
			function(selector) {
				//poorman's polyfill for matchesSelector
				var elements = this.parentElement.querySelectorAll(selector),
					i = 0,
					element;

				while(element = elements[i++]){
					if(element === this) return true;
				}
				return false;
			};
	}

	//how long finger needs to touch screen to fire onhold callbacks
	var HOLDTIME = 500,
		//how many pixels finger can move before we cancel tap
		THRESHOLD = 3,

		//x, y starting point of touch
		x,
		y,
		//which should callbacks fire ?
		fire = [],

		//timers
		time,
		dblTapTime,
		holdTime,

		abs = Math.abs,

		//helps minification
		add = 'addEventListener',
		rem = 'removeEventListener',
		func = 'function',
		obj = 'object',
		str = 'string',
		touches = 'touches',
		l = 'length',
		timeout = setTimeout,
		cTimeout = clearTimeout,
		tapEventProp = 'tap3vents',

		//add/remove all listeners remove active class also when needed
		listen = function(elm, command, active){
			elm[command]('touchmove', touchmove);
			elm[command]('touchend', touchend);
			elm[command]('touchcancel', touchend);

			if(active && elm.active && fire[l] > 0) {
				var elem = fire[0][1];
				elem.className = elem.className.replace(' ' + elm.active, '');
			}

			if(command == rem) fire[l] = 0;

			cTimeout(time);
			return 1;
		},

		//helper function to run all callbacks af a type
		runCallbacks = function(callbacks, t, touch, ev){
			if(callbacks) {
				var i = callbacks[l];

				while(i--) {if(callbacks[i].call(t, touch, ev) === false) break;}
			}
		},

		touchend = function(ev){
			if(fire[l] > 0) {

				clearTimeout(holdTime);

				var i = 0,
					match;

				while(match = fire[i++]) {
					var callbacks = this[tapEventProp][match[0]],
						tapCallbacks = callbacks.tap,
						dblTapCallbacks = callbacks.dblTap,
						touch = ev.changedTouches[0],
						t = ev.target;

					if(dblTapCallbacks) {
						if(t.tapped) {
							cTimeout(dblTapTime);
							t.tapped = false;

							runCallbacks(dblTapCallbacks, match[1], touch, ev);
						} else{
							t.tapped = true;
							dblTapTime = timeout((function(callbacks, t, touch, ev){
								return function(){
									ev.target.tapped = false;
									runCallbacks(callbacks, t, touch, ev);
								}
							})(tapCallbacks, match[1], touch, ev) ,250);
						}

					}else{
						runCallbacks(tapCallbacks, match[1], touch, ev);
					}
				}
			}

			listen(this, rem, true);
		},

		//this is where calculation happens
		touchmove = function(ev){
			var t = ev[touches][0];
			!(abs(t.pageX - x) > THRESHOLD || abs(t.pageY - y) > THRESHOLD) && listen(this, rem, true) && cTimeout(holdTime);
		},

		//this is the only listner always bound to an element
		touchstart = function(ev){
			var t = ev.target,
				funcs = this[tapEventProp],
				selector;

			for(selector in funcs) {
				if((selector == 'this' || t.matches(selector))) {

					listen(this, add);

					fire.push([selector, t]);

					var txy = ev[touches][0],
						holds = funcs[selector]['hold'];

					x = txy.pageX;
					y = txy.pageY;

					if(holds) {
						holdTime = timeout((function(callbacks, t, touch, ev, self){
							return function(){
								(fire[l] > 0) && runCallbacks(callbacks, t, touch, ev);
								listen(self, rem, true);
							}
						})(holds, t, txy, ev, this), HOLDTIME);
					}

					time = timeout((function(self){
						return function(){
							if(self.active) (t.className += ' ' + self.active);
						}
					})(this), 60)
				}
			}
		};

	//self - this object
	//element - on which element are we adding callback
	function addCallbacks(self, element, callback, active, type){
		var el,
			i = 0;

		while(el = self.parent[i++]){
			if(!el[tapEventProp]) el[tapEventProp] = {};

			var funcs = el[tapEventProp],
				ref = funcs[element];

			if(ref) {
				if(ref[type]) {
					ref[type].push(callback);
				}else{
					ref[type] = [callback];
				}
			}else{
				funcs[element] = {};
				funcs[element][type] = [callback];
				el[add]('touchstart', touchstart);
			}

			active && (el.active = active);
		}
	}

	function init(callback, active, self, type){
		if(typeof callback == func) {
			addCallbacks(self, 'this', callback, active, type);
		}else if(typeof callback == obj){
			for(var element in callback) {
				addCallbacks(self, element, callback[element], active, type);
			}
		}
		return self;
	}

	function _remove(self, selector, type, callback){
		var func,
			el,
			i = 0,
			j = 0,
			selc;

		while(el = self.parent[i++]) {
			if(el[tapEventProp] && el[tapEventProp][selector]) {
				selc = el[tapEventProp][selector];
				while(func = selc[type][j]) {
					if(func === callback) selc[type].splice(j,1);
					j++;
				}
			}
		}
	}

	context.on = function(parent){
		return {
			parent: (typeof parent == str) ? document.querySelectorAll(parent) : (parent instanceof NodeList) ? parent : [parent],
			tap: function (callback, active){
				return init(callback, active, this, 'tap');
			},
			dblTap: function (callback, active){
				return init(callback, active, this, 'dblTap');
			},
			hold: function (callback, active){
				return init(callback, active, this, 'hold');
			},
			removeAll: function(){
				var parent = this.parent,
					i = parent[l];
				while(i--) delete parent[i][tapEventProp];
			},
			remove: function (type, callback){
				if(typeof callback == func) {
					_remove(this, 'this', type, callback);
				}else if(typeof callback == obj){
					for(var element in callback) _remove(this, element, type, callback[element])
				}
			}
		}
	}
})(window);