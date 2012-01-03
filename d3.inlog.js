(function() {
  var att, createReplacementFunction, defaults, inject, isFunction, logFunctionCall, logFunctionCallAlt, logTrace, maintrace, settings, subtrace, thisType, tracedepth;

  defaults = {
    enabled: false,
    maxDepth: 10,
    indent: true,
    thisValue: true,
    returnValue: true
  };

  settings = {};

  for (att in defaults) {
    if (defaults[att] != null) settings[att] = defaults[att];
  }

  maintrace = null;

  subtrace = null;

  tracedepth = 0;

  isFunction = function(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
  };

  d3.inlog = function(a, obj) {
    var att, _results;
    if (a === true || a === false) {
      if (obj != null) {
        return inject(obj);
      } else {
        return settings.enabled = a;
      }
    } else {
      _results = [];
      for (att in a) {
        if (a[att] != null) _results.push(settings[att] = a[att]);
      }
      return _results;
    }
  };

  /*
  # Outputs a function call with all parameters passed.
  #
  # @param funcName A human readable name of the function called
  # @param origArguments The original "arguments" property inside the function
  # @param origReturn The original return value of the function
  # @param origThis The original context the function was running in
  # @returns undefined
  */

  logFunctionCall = function(funcName, origArguments, origReturn, origThis) {
    var formatString, i, paramFormatStrings, params;
    if (funcName === 'inlog') return;
    params = [];
    paramFormatStrings = [];
    formatString = "";
    i = 0;
    while (i < origArguments.length) {
      if (origArguments[i] === undefined) break;
      params.push(origArguments[i]);
      paramFormatStrings.push("%o");
      i++;
    }
    if (settings.thisValue) {
      formatString = "(%o) # ";
      params.unshift(origThis);
    }
    params.unshift(formatString + funcName + "(" + paramFormatStrings.join(", ") + ")");
    if (settings.returnValue) {
      params[0] += " =>  %o";
      params.push(origReturn);
    }
    return console.log.apply(console, params);
  };

  logFunctionCallAlt = function(funcName, origArguments, origReturn, origThis, trace) {
    var formatString, i, package_name, paramFormatStrings, params;
    if (funcName === 'inlog') return;
    params = [];
    paramFormatStrings = [];
    formatString = "";
    i = 0;
    package_name = false;
    console.groupCollapsed("" + (thisType(origThis)) + ": " + funcName);
    if (settings.thisValue) {
      console.groupCollapsed('this');
      console.log.apply(console, ["%o", origThis]);
      console.groupEnd();
    }
    while (i < origArguments.length) {
      if (origArguments[i] === undefined) break;
      params.push(origArguments[i]);
      paramFormatStrings.push("%o");
      i++;
    }
    params.unshift(formatString + funcName + "(" + paramFormatStrings.join(", ") + ")");
    console.group('params');
    console.log.apply(console, params);
    console.groupEnd();
    if (settings.returnValue) {
      console.group('returns');
      console.log.apply(console, ["%o", origReturn]);
      console.groupEnd();
    }
    if (trace["sub"].length) {
      if (settings.indent) console.groupCollapsed('subtraces');
      i = 0;
      while (i < trace["sub"].length) {
        logTrace(trace["sub"][i]);
        i++;
      }
      if (settings.indent) console.groupEnd();
    }
    console.log.apply(console, ["trace depth: %i", trace['tracedepth']]);
    return console.groupEnd(funcName);
  };

  thisType = function(_this) {
    if (_this === window) return 'window';
    if (_this === d3) return 'd3';
    if (_this === d3.scale) return 'd3.scale';
    if (_this === d3.csv) return 'd3.csv';
    if ((_this.domain != null) && (_this.range != null) && (_this.ticks != null)) {
      return 'd3.scale.linear';
    }
    if ((_this.classed != null) && (_this.data != null) && (_this.enter != null)) {
      return 'd3.selection(update)';
    }
    if ((_this.classed != null) && (_this.data != null)) return 'd3.selection';
    if ((_this.delay != null) && (_this.duration != null)) return 'd3.transition';
    return 'Function Call';
  };

  /*
  # Outputs the stack trace to console.
  # Basically simple tree traversing.
  #
  # @param trace The object with the trace info
  # @returns undefined
  */

  logTrace = function(trace) {
    return logFunctionCallAlt(trace["function"], trace["arguments"], trace["return"], trace["this"], trace);
  };

  /*
  # Creates a Function which calls the "origFunction"
  # and logs the call with the function as called "funcName".
  # 
  # @param funcName The name of the original function. Human readable.
  # @param origFunction A reference to the original function getting wrapped.
  # @returns A function, which calls the original function sourended by log calls.
  */

  createReplacementFunction = function(funcName, origFunction) {
    return function() {
      var isFirst, parenttrace, ret, _trace;
      if (settings.enabled === false) return origFunction.apply(this, arguments);
      if (settings.maxDepth !== -1 && tracedepth > settings.maxDepth) {
        return origFunction.apply(this, arguments);
      }
      _trace = {
        "function": funcName,
        "this": this,
        arguments: arguments,
        sub: [],
        tracedepth: tracedepth
      };
      parenttrace = void 0;
      isFirst = tracedepth === 0;
      tracedepth++;
      if (isFirst) {
        maintrace = subtrace = _trace;
      } else {
        parenttrace = subtrace;
        subtrace["sub"].push(_trace);
        subtrace = _trace;
      }
      ret = origFunction.apply(this, arguments);
      if (isFunction(ret)) inject(ret);
      _trace["return"] = ret;
      if (isFirst) {
        tracedepth = 0;
        logTrace(maintrace);
      } else {
        subtrace = parenttrace;
      }
      return ret;
    };
  };

  /*
  # Injects log calls inside some functions of "obj"
  # depending on the "list" and "inverted" parameter.
  #
  # If "inverted" is true, only the props inside "list" are considered.
  # If "inverted" is not true, all props inside "list" are ignored.
  #
  # @param obj An object which should get each function replaced.
  # @param list An optional array of strings with props to consider.
  # @param inverted An optional boolean indicating how "list" is to be interpreted.
  # @returns undefined
  */

  inject = function(obj, list, inverted) {
    var prop, _results;
    if (list == null) list = [];
    if (inverted == null) inverted = false;
    list = "," + (list || []).join(",") + ",";
    if ((obj != null ? obj.__inlog__ : void 0) != null) return;
    if (obj != null) obj.__inlog__ = true;
    _results = [];
    for (prop in obj) {
      _results.push((function(prop) {
        if (obj.hasOwnProperty(prop) && isFunction(obj[prop]) && (list.indexOf("," + prop + ",") !== -1) === inverted) {
          return obj[prop] = createReplacementFunction(prop, obj[prop]);
        } else {

        }
      })(prop));
    }
    return _results;
  };

  inject(d3.selection.prototype);

  inject(d3.transition.prototype);

  inject(d3.scale);

  inject(d3.csv);

  inject(d3, ['csv']);

}).call(this);
