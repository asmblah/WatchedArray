define(["../ext/EventEmitter/src/EventEmitter"], function(EventEmitter) {
	var createWatchedArray = function() {
		var MAX_SIGNED_INT_VALUE = Math.pow(2, 32) - 1,
		hasOwnProperty = Object.prototype.hasOwnProperty;

		function ToUint32(value) {
			return value >>> 0;
		};

		function getMaxIndexProperty(object) {
			var maxIndex = -1, isValidProperty;
			
			for (var prop in object) {
				
				isValidProperty = (
					String(ToUint32(prop)) === prop && 
					ToUint32(prop) !== MAX_SIGNED_INT_VALUE && 
					hasOwnProperty.call(object, prop));
					
				if (isValidProperty && prop > maxIndex) {
					maxIndex = prop;
				}
			}
			return maxIndex;
		};

		function hasGetter(obj, name) {
			var descriptor = Object.getOwnPropertyDescriptor(obj, name);
			return descriptor && descriptor.get;
		}

		function hasSetter(obj, name) {
			var descriptor = Object.getOwnPropertyDescriptor(obj, name);
			return descriptor && descriptor.set;
		}

		return (function(methods) {
			var _array = [];
			var emitter = new EventEmitter();
			var length = 0;
			var lastLength = 0;
			methods = methods || { };

			methods.length = {
				get: function() {
					var self = this;
					var maxIndexProperty = +getMaxIndexProperty(this);
					var maxLength = Math.max(length, maxIndexProperty + 1);
					length = maxLength;
					if (length != lastLength) {
						lastLength = length;
						for (var i = 0; i < lastLength; i++) {
							if (this[i] !== undefined) {
								if (!hasGetter(this, i)) {
									_array[i] = this[i];
									(function() {
										var index = i;
										Object.defineProperty(self, i, {
											get: function() {
												emitter.emit('get', index, _array[index]);
												return _array[index];
											}
										});
									})();
									(function() {
										var index = i;
										Object.defineProperty(self, i, {
											set: function(val) {
												_array[index] = val;
												emitter.emit('set', index, val);
											}
										});
									})();
									emitter.emit('push', i, _array[i]);
								}
							}
						}
					}
					return length;
				},
				set: function(value) {
					var constrainedValue = ToUint32(value);
					if (constrainedValue !== +value) {
						throw new RangeError();
					}
					for (var i = constrainedValue, len = this.length; i < len; i++) {
						delete this[i];
					}
					length = constrainedValue;
					if (length < lastLength) {
						emitter.emit('pop', length);
					}
					lastLength = length;
				}
			};
			methods.toString = {
				value: Array.prototype.join
			};

			var Wrapper = Object.create(Array.prototype, methods);
			Wrapper.on = function(event, callback) {
				emitter.on.apply(emitter, [event,callback]);
			};
			Wrapper.emit = function(event, param1, param2) {
				emitter.emit.apply(emitter, [event, param1, param2]);
			};

			return Wrapper;
		})();
	};

	var methods = {
		last: {
			value: function() {
				return this[this.length - 1];
			}
		}
	};

	return function() {
		var arr = createWatchedArray(methods);
		if (arguments.length === 1) {
			if (arguments[0].length === undefined) {
				arr.length = arguments[0];
			}
			else {
				arr.push.apply(arr, arguments[0]);
			}
		}
		else {
			arr.push.apply(arr, arguments);
		}
		return arr;
	};
});
