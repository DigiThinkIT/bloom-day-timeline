var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _class, _temp, _class2, _temp2;

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

import "./styles.less";
import React, { PureComponent } from 'react';
import moment from 'moment';
import 'element-closest';
import PropTypes from 'prop-types';
import momentPropTypes from 'react-moment-proptypes';

export var ItemProp = PropTypes.shape({
  /**
   * An id to track this item's state
   */
  id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  /**
   * The start measurement of the item. Measured with momentjs.
   */
  start: momentPropTypes.momentObj,
  /**
   * The end measure of the item. Measured with momentjs.
   */
  end: momentPropTypes.momentObj,
  /**
   * Set to false to dissable time block dragging
   */
  canDrag: PropTypes.boolean,
  /**
   * Set to false to dissable time block resizing
   */
  canResize: PropTypes.canResize
});

/**
 * Supported zoom levels
 */
export var ZOOMLEVELS = [60, 30, 15, 10, 5, 1];

/**
 * Searches a base element for all of its "selector" children(recursive) that lay under x, y.
 * @param {DOMDElement} base Base Element to start the search
 * @param {int} x X position the matching elements must contain.
 * @param {int} y Y position the matching elements must contain.
 * @param {string} selector A css selector to search under base.
 */
var findElementsUnderPoint = function findElementsUnderPoint(base, x, y, selector) {
  if (!selector) selector = "*";

  return Array.from(base.querySelectorAll(selector)).reduce(function (acc, el) {
    var rect = el.getBoundingClientRect();
    if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
      acc.push(el);
    }

    return acc;
  }, []);
};

/**
 * Rounds down provided moment by interval minutes
 * @param {moment} m Moment value to round down
 * @param {int} interval An interval in minutes (1-60) to round to.
 * @returns {moment}
 */
export var nearestMinutesDown = function nearestMinutesDown(m, interval) {
  var tmp = Math.floor(m.minute() / interval) * interval;
  return m.clone().minute(tmp).second(0);
};

/**
 * Rounds up provided moment by interval minutes
 * @param {moment} m Moment value to round up
 * @param {int} interval An interval in minutes (1-60) to round to.
 * @returns {moment}
 */
export var nearestMinutesUp = function nearestMinutesUp(m, interval) {
  var tmp = Math.ceil(m.minute() / interval) * interval;
  return m.clone().minute(tmp).second(0);
};

/**
 * Finds start and end time extremes in passed items. Used to stretch the timeline to display items
 * with times in between days.
 * @param {moment} startTime The low time bound
 * @param {moment} endTime The high time bound
 * @param {Array} items An array of items { start: <moment>, end: <moment> }
 * @param {int} roundTo An integer interval to round to (1-60) measured in minutes.
 * @returns {object} Returns { starTime: <moment>, endTime: <moment> }
 */
export var findStartEndTime = function findStartEndTime(startTime, endTime, items, roundTo) {
  var result = {
    startTime: startTime,
    endTime: endTime
  };

  items.forEach(function (item) {
    if (item.start.isBefore(result.startTime)) {
      result.startTime = nearestMinutesDown(item.start, roundTo);
    }

    // as a precaution we check item time length so that we can test the end
    // time far enough so accomodate short blocks(since they have a min-height)
    // here we use roundTo * 3 to add to the end extreme check.
    var timeLength = moment.duration(item.end.diff(item.start, "minutes"), "minutes", true).asMinutes();
    var end = item.end;
    if (roundTo >= 30 && timeLength < roundTo * 3) {
      end = end.clone().add(roundTo * 2, "minutes");
    }

    if (end.isAfter(result.endTime)) {
      result.endTime = nearestMinutesUp(end, roundTo);
    }
  });

  return result;
};

/**
 * Simple timeline label component. Prints times along the timeline.
 * @param {object} props 
 */
var TimeLabel = function TimeLabel(props) {
  var time = props.time,
      _props$format = props.format,
      format = _props$format === undefined ? "hh:mm a" : _props$format;

  return React.createElement(
    'div',
    { className: 'time-label' },
    time.format(format)
  );
};

TimeLabel.propTypes = process.env.NODE_ENV !== "production" ? {
  /**
   * A time measure used to label a slice.
   */
  time: PropTypes.instanceOf(moment).isRequired,
  /**
   * The time formatting used to render a label slice.
   */
  format: PropTypes.string
} : {};

TimeLabel.defaultProps = {
  format: "hh:mm a"
};

/**
 * A dragable component used as a resize handles on the TimeBlock component.
 */

var ResizeHandle = function (_PureComponent) {
  _inherits(ResizeHandle, _PureComponent);

  function ResizeHandle(props) {
    _classCallCheck(this, ResizeHandle);

    /**
     * DOMElement reference to this component
     */
    var _this = _possibleConstructorReturn(this, _PureComponent.call(this, props));

    _this.reference = React.createRef();

    /**
     * @property {object} eventHandlers Mouse event handlers to track dom events outside of react.
     * @param {function} eventHandlers.onMouseMove The mousemove dom event handler
     * @param {function} eventHandlers.onMouseDown The mousedown dom event handler
     * @param {function} this.eventHandlers.onMouseUp The mouseup dom event handler
     */
    _this.eventHandlers = {
      onMouseMove: _this.onMouseMove.bind(_this),
      onMouseDown: _this.onMouseDown.bind(_this),
      onMouseUp: _this.onMouseUp.bind(_this)

      /**
       * @property {bool} Tracks mouse down state
       */
    };_this.mouseDown = false;
    /**
     * @property {int} moveY The vertical offset movement from the original y position
     */
    _this.moveY = null;
    /**
     * @property {int} originY The original y position before mouse dragging starts
     */
    _this.originY = null;
    return _this;
  }

  /**
   * Tracks mouse movement outside of react
   * @param {MouseEvent} e MouseEvent object
   */


  /**
   * @static {object} propTypes ReactJS Prop Type Definition
   */


  ResizeHandle.prototype.onMouseDown = function onMouseDown(e) {
    var rect = this.reference.current.getBoundingClientRect();
    this.mouseDown = true;
    this.originY = rect.top;
    e.cancelBubble = true;
  };

  /**
   * Tracks mouse up event outside of react. 
   * @param {MouseEvent} e MouseEvent object
   */


  ResizeHandle.prototype.onMouseUp = function onMouseUp(e) {
    if (this.mouseDown && this.originY !== null) {
      var dy = e.clientY - this.originY;
      var y = this.originY + dy;
      this.mouseDown = false;
      this.moveY = null;
      if (typeof this.props.onMove === 'function') this.props.onApplyResize(y, dy, this.reference.current.clientHeight);
      e.cancelBubble = true;
    }
  };

  /**
   * Tracks mouse move event outside of react. 
   * @param {MouseEvent} e MouseEvent object
   */


  ResizeHandle.prototype.onMouseMove = function onMouseMove(e) {
    if (this.mouseDown) {
      var dy = e.clientY - this.originY;
      this.moveY = this.originY + dy;
      if (typeof this.props.onMove === 'function') this.props.onMove(this.moveY, dy, this.reference.current.clientHeight);
      e.cancelBubble = true;
    }
  };

  /**
   * React did mount hook. We use it to setup event handlers on the dom outside of react.
   */


  ResizeHandle.prototype.componentDidMount = function componentDidMount() {
    if (this.reference) {
      var handle = this.reference.current;
      handle.addEventListener("mousedown", this.eventHandlers.onMouseDown);
      handle.addEventListener("touchstart", this.eventHandlers.onMouseDown);
      // mouse move and dropping handled on body
      document.body.addEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.addEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.addEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  };

  /**
   * React will ummount hook. We use it to clean up event handlers on the dom setup previously.
   */


  ResizeHandle.prototype.componentWillUnmount = function componentWillUnmount() {
    if (this.reference) {
      var handle = this.reference.current;
      handle.removeEventListener("mousedown", this.eventHandlers.onMouseDown);
      handle.removeEventListener("touchstart", this.eventHandlers.onMouseDown);
      document.body.removeEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  };

  ResizeHandle.prototype.render = function render() {
    return React.createElement(
      'div',
      { className: [this.props.className || "", "handler"].join(" "), ref: this.reference },
      '='
    );
  };

  return ResizeHandle;
}(PureComponent);

ResizeHandle.propTypes = process.env.NODE_ENV !== "production" ? {
  /**
   * @prop {string} className Extra className to use on our component
   */
  className: PropTypes.string
} : {};
var TimeBlock = (_temp = _class = function (_PureComponent2) {
  _inherits(TimeBlock, _PureComponent2);

  function TimeBlock(props) {
    _classCallCheck(this, TimeBlock);

    var _this2 = _possibleConstructorReturn(this, _PureComponent2.call(this, props));

    _this2.reference = React.createRef();

    /**
     * @property {object} state Component State
     * @property {int} state.update An update version counter to force refresh component.
     */
    _this2.state = {
      update: 0
    };
    return _this2;
  }

  /**
   * 
   * @param {string} side Either "start" or "end" flags to triger resizing top or bottom of the block.
   * @param {int} y The y position of the resize element while dragging.
   * @param {int} dy The offset position of the resize element relative to its last location.
   * @param {int} height The height of the resize element.
   * @param {bool} apply When true, the resize measurements should be applied to the block and updated upstream.
   */


  TimeBlock.prototype.onLiveResize = function onLiveResize(side, y, dy, height, apply) {
    var _this3 = this;

    if (typeof apply === 'undefined') apply = false;

    if (side == "start") {
      if (apply) {
        // let timeline re-render and setup size
        this.props.onStartResize(this.props.dataId, dy, function () {
          return _this3.setState(function (prevState) {
            return { update: prevState.update + 1 };
          });
        });
        this.reference.current.style.zIndex = 'auto';
      } else {
        this.reference.current.style.top = this.props.y + dy + 'px';
        this.reference.current.style.height = this.props.height - dy + 'px';
        this.reference.current.style.zIndex = 10;
      }
    } else if (side == "end") {
      if (apply) {
        // let timeline re-render and setup size
        this.props.onEndResize(this.props.dataId, dy + height, function () {
          return _this3.setState(function (prevState) {
            return { update: prevState.update + 1 };
          });
        });
        this.reference.current.style.zIndex = 'auto';
      } else {
        // we want to adjust the block height based on the handler's bottom offset
        this.reference.current.style.height = this.props.height + dy - height + 'px';
        this.reference.current.style.zIndex = 10;
      }
    }
  };

  TimeBlock.prototype.render = function render() {
    var _this4 = this;

    var _props = this.props,
        color = _props.color,
        height = _props.height,
        y = _props.y,
        dataId = _props.dataId,
        itemContentRenderer = _props.itemContentRenderer,
        item = _props.item,
        _props$rightMargin = _props.rightMargin,
        rightMargin = _props$rightMargin === undefined ? 0 : _props$rightMargin,
        _props$leftMargin = _props.leftMargin,
        leftMargin = _props$leftMargin === undefined ? 0 : _props$leftMargin;
    var _item$canResize = item.canResize,
        canResize = _item$canResize === undefined ? true : _item$canResize,
        _item$canDrag = item.canDrag,
        canDrag = _item$canDrag === undefined ? true : _item$canDrag;

    var onTopHandleMove = function onTopHandleMove(y, dy, height) {
      return _this4.onLiveResize('start', y, dy, height);
    };
    var onBottomHandleMove = function onBottomHandleMove(y, dy, height) {
      return _this4.onLiveResize('end', y, dy, height);
    };
    var onTopHandleApply = function onTopHandleApply(y, dy, height) {
      return _this4.onLiveResize('start', y, dy, height, true);
    };
    var onBottomHandleApply = function onBottomHandleApply(y, dy, height) {
      return _this4.onLiveResize('end', y, dy, height, true);
    };

    return React.createElement(
      'div',
      {
        key: 'block-update-' + this.state.update,
        'data-id': dataId,
        style: {
          top: y,
          height: height,
          minHeight: 30,
          marginRight: rightMargin,
          marginLeft: leftMargin,
          backgroundColor: color
        },
        className: 'time-block ' + (canDrag ? "draggable" : ""),
        ref: this.reference
      },
      canResize && React.createElement(ResizeHandle, { className: 'top', onMove: onTopHandleMove, onApplyResize: onTopHandleApply }),
      React.createElement(
        'div',
        { className: 'content' },
        itemContentRenderer(item)
      ),
      canResize && React.createElement(ResizeHandle, { className: 'bottom', onMove: onBottomHandleMove, onApplyResize: onBottomHandleApply })
    );
  };

  return TimeBlock;
}(PureComponent), _class.defaultProps = {
  rightMargin: 0,
  leftMargin: 0
}, _temp);

/**
 * Timeline component. Displays a timeline from start to end time including custom items placed in this timeline.
 * @class Timeline
 */

TimeBlock.propTypes = process.env.NODE_ENV !== "production" ? {
  /**
   * Optional background color to apply to our block.
   */
  color: PropTypes.string,
  /**
   * The height in pixels of our block. Usually computed from start and end time measurements
   */
  height: PropTypes.number.isRequired,
  /**
   * The y position in pixels of our block. Usually computed from start time measurement.
   */
  y: PropTypes.number.isRequired,
  /**
   * The item id to use to track this component data map.
   */
  dataId: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  /**
   * An item content renderer callback to use when rendering custom content.
   */
  itemContentRenderer: PropTypes.func.isRequired,
  /**
   * The Item object containing block time information.
   */
  item: ItemProp.isRequired,
  /**
   * The right margin measured in pixels. Used to display stacked time offsets.
   */
  rightMargin: PropTypes.number,
  /**
   * The left margin measured in pixels. Used to display stacked time offsets.
   */
  leftMargin: PropTypes.number
} : {};
export var Timeline = (_temp2 = _class2 = function (_PureComponent3) {
  _inherits(Timeline, _PureComponent3);

  /**
   * @prop {object} propTypes Timeline react props
   * @static
   */
  function Timeline(props) {
    _classCallCheck(this, Timeline);

    var _this5 = _possibleConstructorReturn(this, _PureComponent3.call(this, props));

    _this5.reference = React.createRef();

    _this5.state = {
      itemUpdates: {}
    };

    _this5.eventHandlers = {
      onMouseMove: _this5.onMouseMove.bind(_this5),
      onMouseDown: _this5.onMouseDown.bind(_this5),
      onMouseUp: _this5.onMouseUp.bind(_this5)
    };

    _this5.moveBlock = null;
    _this5.moveBlockOriginRect = null;
    _this5.mouseMoveOrigin = null;
    _this5.moveBlockNewY = null;
    return _this5;
  }

  /**
   * Tracks mouse down event outside of react
   * @param {MouseEvent} e MouseEvent object
   */


  Timeline.prototype.onMouseDown = function onMouseDown(e) {
    var x = e.clientX,
        y = e.clientY;

    // we only care about blocks, so we can lock a mouse down event
    // while adjusting time would be done on onMouseMove
    var blocks = findElementsUnderPoint(this.reference.current, x, y, ".time-block");
    if (blocks.length > 0) {
      // sort blocks by computed z-index so we can pick the top most block
      blocks.sort(function (a, b) {
        var az = parseInt(window.getComputedStyle(a).zIndex) || 0;
        var bz = parseInt(window.getComputedStyle(b).zIndex) || 0;
        return bz - az;
      });

      var item = this.props.items.find(function (itm) {
        return itm.id.toString() === blocks[0].dataset.id.toString();
      });
      var _item$canDrag2 = item.canDrag,
          canDrag = _item$canDrag2 === undefined ? true : _item$canDrag2;


      if (canDrag) {
        this.moveBlock = blocks[0];
        this.moveBlockOriginRect = this.moveBlock.getBoundingClientRect();
        this.mouseMoveOrigin = { x: x, y: y };
      }
    }

    this.reference.current.style.zIndex = 10;
    e.cancelBubble = true;
  };

  /**
   * Tracks mouse up event outside of react
   * @param {MouseEvent} e MouseEvent object
   */


  Timeline.prototype.onMouseUp = function onMouseUp(e) {
    var _this6 = this;

    // require both a selected block and movement to run any of this
    // code, as we don't want blocks to reset on just clicks.
    if (this.moveBlock && this.moveBlockNewY) {
      var _props2 = this.props,
          timeHeader = _props2.timeHeader,
          contentHeader = _props2.contentHeader,
          _props2$zoom = _props2.zoom,
          zoom = _props2$zoom === undefined ? 0 : _props2$zoom,
          _props2$sliceHeight = _props2.sliceHeight,
          sliceHeight = _props2$sliceHeight === undefined ? 20 : _props2$sliceHeight,
          items = _props2.items;

      var zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length ? ZOOMLEVELS[zoom] : 1;
      var _props3 = this.props,
          _props3$startTime = _props3.startTime,
          startTime = _props3$startTime === undefined ? moment().startOf("day") : _props3$startTime,
          _props3$endTime = _props3.endTime,
          endTime = _props3$endTime === undefined ? moment().endOf("day") : _props3$endTime;

      var _findStartEndTime = findStartEndTime(startTime, endTime, items, zoomMinutes);

      startTime = _findStartEndTime.startTime;
      endTime = _findStartEndTime.endTime;


      var startScale = (this.moveBlockNewY - (timeHeader || contentHeader ? sliceHeight : 0)) / sliceHeight * zoomMinutes;
      var start = startTime.clone().add(Math.floor(startScale / zoomMinutes) * zoomMinutes, "minutes");
      var origItem = this.props.items.find(function (itm) {
        return itm.id.toString() === _this6.moveBlock.dataset.id.toString();
      });
      var blockLengthinMinutes = moment.duration(origItem.end.diff(origItem.start, "minutes"), "minutes", true).asMinutes();

      var item = Object.assign({}, origItem, {
        start: start,
        end: start.clone().add(blockLengthinMinutes, "minutes")
      });

      // Important: Resetting these vars needs to happen before the callback
      //            A rendering process could happen before the callback returns
      //            causing issues with mouseMove events triggering before reset.
      this.moveBlock = null;
      this.moveBlockNewY = null;
      e.cancelBubble = true;
      if (typeof this.props.onTimeBlockChange === 'function') this.props.onTimeBlockChange(item);
      this.reference.current.style.zIndex = 1;
      this.setState(function (prevState) {
        var _extends2;

        return {
          itemUpdates: _extends({}, prevState.itemUpdates, (_extends2 = {}, _extends2[item.id] = (prevState.itemUpdates[item.id] || 0) + 1, _extends2))
        };
      });
    } else {
      this.moveBlock = null;
      this.moveBlockNewY = null;
    }
  };

  /**
   * Tracks mouse movement outside of react
   * @param {MouseEvent} e MouseEvent object
   */


  Timeline.prototype.onMouseMove = function onMouseMove(e) {
    if (this.moveBlock) {
      var thisRect = this.reference.current.getBoundingClientRect();
      var dy = e.clientY - this.mouseMoveOrigin.y;
      // new position is based on position before moving + offset - the top position of this timeline element on the page.
      this.moveBlockNewY = this.moveBlockOriginRect.top + dy - thisRect.top;
      this.moveBlock.style.top = this.moveBlockNewY + 'px';
      e.cancelBubble = true;
    }
  };

  /**
   * Callback used by TimeBlock to trigger time resize started by user dragging behaviour
   * @param {*} id The item id to map this resize event
   * @param {*} dy The y offset of the resize event
   * @param {*} done A callback to trigger TimeBlock render reset(due to dom changes vs virtual dom)
   */


  Timeline.prototype.onBlockStartResize = function onBlockStartResize(id, dy, done) {
    var _props4 = this.props,
        _props4$sliceHeight = _props4.sliceHeight,
        sliceHeight = _props4$sliceHeight === undefined ? 20 : _props4$sliceHeight,
        _props4$zoom = _props4.zoom,
        zoom = _props4$zoom === undefined ? 0 : _props4$zoom;

    var zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length ? ZOOMLEVELS[zoom] : 1;
    var origItem = this.props.items.find(function (itm) {
      return itm.id.toString() === id.toString();
    });
    var timeScale = dy / sliceHeight * zoomMinutes;
    var diffTime = Math.floor(timeScale / zoomMinutes) * zoomMinutes;
    var start = nearestMinutesDown(origItem.start.clone().add(diffTime, "minutes"), zoomMinutes);
    var end = origItem.end.clone();

    if (start.isAfter(end)) {
      end = start.clone().add(zoomMinutes, "minutes");
    }

    var item = Object.assign({}, origItem, {
      start: start,
      end: end
    });

    done();
    if (typeof this.props.onTimeBlockChange === 'function') this.props.onTimeBlockChange(item);
  };

  /**
   * Callback used by TimeBlock to trigger time resize started by user dragging behaviour
   * @param {*} id The item id to map this resize event
   * @param {*} dy The y offset of the resize event
   * @param {*} done A callback to trigger TimeBlock render reset(due to dom changes vs virtual dom)
   */


  Timeline.prototype.onBlockEndResize = function onBlockEndResize(id, dy, done) {
    var _props5 = this.props,
        _props5$sliceHeight = _props5.sliceHeight,
        sliceHeight = _props5$sliceHeight === undefined ? 20 : _props5$sliceHeight,
        _props5$zoom = _props5.zoom,
        zoom = _props5$zoom === undefined ? 0 : _props5$zoom;

    var zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length ? ZOOMLEVELS[zoom] : 1;
    var origItem = this.props.items.find(function (itm) {
      return itm.id.toString() === id.toString();
    });
    var timeScale = dy / sliceHeight * zoomMinutes;
    var diffTime = Math.floor(timeScale / zoomMinutes) * zoomMinutes;
    var end = nearestMinutesDown(origItem.end.clone().add(diffTime, "minutes"), zoomMinutes);

    // don't allow end time to go negative
    if (end.isBefore(origItem.start)) {
      end = origItem.start.clone().add(zoomMinutes, "minutes");
    }

    var item = Object.assign({}, origItem, {
      end: end
    });

    done();
    if (typeof this.props.onTimeBlockChange === 'function') this.props.onTimeBlockChange(item);
  };

  /**
   * Component did mount hook. We setup dom events outside of react here.
   */


  Timeline.prototype.componentDidMount = function componentDidMount() {
    if (this.reference) {
      var timeline = this.reference.current;
      // mouse grab based on timeline
      timeline.addEventListener("mousedown", this.eventHandlers.onMouseDown);
      timeline.addEventListener("touchstart", this.eventHandlers.onMouseDown);
      // mouse move and dropping handled on body so we account for faster mouse
      // movement over rendering updates and generally droping the block while
      // constratined on a vertical line.
      document.body.addEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.addEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.addEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  };

  /**
   * Component will unmount. Used to clean up previously set dom events.
   */


  Timeline.prototype.componentWillUnmount = function componentWillUnmount() {
    if (this.reference) {
      var timeline = this.reference.current;
      // cleanup
      timeline.removeEventListener("mousedown", this.eventHandlers.onMouseDown);
      timeline.removeEventListener("touchstart", this.eventHandlers.onMouseDown);
      document.body.removeEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  };

  /**
   * Component did update(after render). Used to reset mouse dragging state(sanity check)
   */


  Timeline.prototype.componentDidUpdate = function componentDidUpdate() {
    this.moveBlock = null;
  };

  Timeline.prototype.render = function render() {
    var _this7 = this;

    var _props6 = this.props,
        _props6$zoom = _props6.zoom,
        zoom = _props6$zoom === undefined ? 0 : _props6$zoom,
        _props6$timeFormattin = _props6.timeFormatting,
        timeFormatting = _props6$timeFormattin === undefined ? "hh:mm a" : _props6$timeFormattin,
        timeHeader = _props6.timeHeader,
        contentHeader = _props6.contentHeader,
        _props6$sliceHeight = _props6.sliceHeight,
        sliceHeight = _props6$sliceHeight === undefined ? 20 : _props6$sliceHeight;
    var _props7 = this.props,
        _props7$startTime = _props7.startTime,
        startTime = _props7$startTime === undefined ? moment().startOf("day") : _props7$startTime,
        _props7$endTime = _props7.endTime,
        endTime = _props7$endTime === undefined ? moment().endOf("day") : _props7$endTime;

    var zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length ? ZOOMLEVELS[zoom] : 1;
    var slices = [];
    var blocks = [];
    var onStartResize = function onStartResize(id, dy, done) {
      return _this7.onBlockStartResize(id, dy, done);
    };
    var onEndResize = function onEndResize(id, dy, done) {
      return _this7.onBlockEndResize(id, dy, done);
    };
    var idx = 0;

    // clone and sort items so we can remove items as we build our blocks
    var items = (this.props.items || []).slice(0).sort(function (a, b) {
      return a.start.diff(b.start);
    });
    var origStartTime = startTime.clone();
    var origEndTime = endTime.clone();

    // inject headers if client provided them
    var _findStartEndTime2 = findStartEndTime(startTime, endTime, items, zoomMinutes);

    startTime = _findStartEndTime2.startTime;
    endTime = _findStartEndTime2.endTime;
    if (timeHeader || contentHeader) {
      idx++;
      slices.push(React.createElement(
        'div',
        {
          key: 'headers',
          className: 'time-slice header',
          style: {
            height: sliceHeight + 'px',
            lineHeight: sliceHeight + 'px'
          }
        },
        React.createElement(
          'div',
          { className: 'time-label' },
          timeHeader
        ),
        React.createElement(
          'div',
          { className: 'time-content' },
          contentHeader
        )
      ));
    }

    /* This section deals with figuring out left and right margin so accomodate form overlaping blocks.
     * As more blocks are displayed, it gets harder to select and adjust them.
     * This bit of code arranges the blocks in a tree structure making larger blocks parents of smaller ones
     * Later we use this information to build both margins from the number of nested parents as well
     * as aggregated children count.
     */

    /**
     * Simple helper function to create nodes from a block item.
     * @param {object} item 
     */
    var createNode = function createNode(item) {
      return {
        id: item.id,
        leftMargin: 0,
        rightMargin: 0,
        item: item,
        parents: [],
        children: []
      };
    };
    /**
     * Simple helper to build a node in the tree structure.
     * @param {object} tree 
     * @param {object} item 
     */
    var findNode = function findNode(tree, item) {
      if (!Reflect.has(tree, item.id)) {
        var node = createNode(item);
        Reflect.set(tree, node.id, node);
        return node;
      }
      return Reflect.get(tree, item.id);
    };
    /**
     * Recursively counts parent links to create the right margin of any node representing an item.
     */
    var accumulatedRightMargin = function accumulatedRightMargin(node) {
      if (!node) return 0;

      var result = 0;
      if (node.parent) result += 1 + accumulatedRightMargin(node.parent);
      return result;
    };
    /**
     * Counts nested children inside a node to build left margin.
     * @param {object} node A node representing an item
     * @param {int} max The margin counter
     */
    var accumulatedLeftMargin = function accumulatedLeftMargin(node, max) {
      var result = max;
      node.children.forEach(function (child) {
        result = +accumulatedLeftMargin(child, result + 1);
      });
      return result;
    };
    /**
     * Helper function, used to figure out if a node already exists in the parent/child chain
     * This is used to prevent infinite loops while building margins so a child only appears
     * once in the chain.
     */
    var isNodeAlreadyInChain = function isNodeAlreadyInChain(parent, node) {
      if (parent == node || parent.parent == node || node.parent == parent) {
        return true;
      } else if (parent.children.indexOf(node) > -1) {
        return true;
      } else if (parent.parent) {
        return isNodeAlreadyInChain(parent.parent, node);
      }
      return false;
    };
    // margins is our tree structure, we'll use it as an in memory dictionary to quickly find
    // find our data.
    var margins = {};
    items.reverse().forEach(function (parent) {
      var parentNode = findNode(margins, parent);

      items.forEach(function (child) {
        if (parent.id != child.id) {
          if (child.start.isBetween(parent.start, parent.end, "minutes", "[)")) {
            var childNode = findNode(margins, child);
            // if we have a parent check if this new parent is closer.
            // if so, then we'll make it the child's new parent
            if (childNode.parent) {
              var currentParentDiff = childNode.item.start.diff(childNode.parent.item.start, "minutes");
              var newParentDiff = childNode.item.start.diff(parentNode.item.start, "minutes");
              if (newParentDiff < currentParentDiff) {
                if (!isNodeAlreadyInChain(parentNode, childNode)) {
                  // make sure to remove child from old parent if we are re-parenting.
                  childNode.parent.children = childNode.parent.children.filter(function (c) {
                    return c.id !== childNode.id;
                  });
                  childNode.parent = parentNode;
                  childNode.parent.children.push(childNode);
                }
              }
            } else {
              if (!isNodeAlreadyInChain(parentNode, childNode)) {
                childNode.parent = parentNode;
                childNode.parent.children.push(childNode);
              }
            }
          }
        }
      });
    });

    // After we have built our tree structure we should have all the information
    // we need to figure out the total number of parent/child relationships
    // Here we accumulate and build our left and right margins.
    Object.values(margins).forEach(function (node) {
      node.rightMargin = accumulatedRightMargin(node);
    });
    Object.values(margins).forEach(function (node) {
      node.leftMargin = accumulatedLeftMargin(node, 0);
    });

    // build slice by zoom level

    var _loop = function _loop(t) {
      // simple extra className to fit separator styling
      var extraClass = "";
      if (t.minutes() == 0) extraClass = "separator";
      if (t.isBefore(origStartTime)) extraClass += " yesterday";
      if (t.isAfter(origEndTime)) extraClass += " tomorrow";

      // build slice
      slices.push(React.createElement(
        'div',
        {
          key: t.format("YYYY-MM-DD hh:mm:ss a"),
          style: { height: sliceHeight + 'px', lineHeight: sliceHeight + 'px' },
          className: 'time-slice ' + extraClass
        },
        React.createElement(TimeLabel, {
          time: t.clone(),
          format: timeFormatting
        })
      ));

      // run through items checking if they start inside this slice.
      // we'll use sumed slice height up to this point to position our block
      var foundItems = items.filter(function (i) {
        return i.start.isBetween(t, t.clone().add(zoomMinutes, "minutes"), 'minute', '[)');
      });
      if (foundItems.length > 0) {
        foundItems.forEach(function (item) {
          var node = findNode(margins, item);
          var rightMargin = node.rightMargin;
          var leftMargin = node.leftMargin;

          // find distance from current slice time to this item start time
          // and round to the nearest zoomMinutes up and down
          var tmpStart = nearestMinutesDown(item.start, zoomMinutes);
          var tmpEnd = nearestMinutesUp(item.end, zoomMinutes);
          var startDiff = moment.duration(tmpStart.diff(t, "minutes"), "minutes", true).asMinutes();
          // Calculates end time rounding so that anything landing between zoomMinutes and (zoomMinutes * 2) - 1
          // will occupy the entire slice height.
          var offset = Math.abs(item.start.diff(item.end, "minutes") / zoomMinutes) % 1; // fast way of extracting decimal value
          // when offset is 0, we want to move our offset by one zoom increment.
          // ex: end is 3:00 and zoom is 60 Minutes, we actually want 4:00 so that visually 
          // we are using the entire slice.
          var correction = offset == 0 ? zoomMinutes : 0;
          var blockLegth = moment.duration(tmpEnd.diff(tmpStart, "minutes") + correction, "minutes", true).asMinutes();
          var startOffset = startDiff / zoomMinutes; // scale offset to place block
          var blockHeight = blockLegth / zoomMinutes; // block height scale to calc height

          // Because we modify the DOM outside of react(to simplify mouse handling and only update when necessary)
          // we keep an item update version number so we can re-key our blocks, forcing a re-render and refresh of
          // styles which would have been kept unseen by react.
          var ver = 0;
          if (item.id in _this7.state.itemUpdates) {
            ver = _this7.state.itemUpdates[item.id];
          }

          // Note: We include the header in the idx count because the timeline element contains everything.
          //       So we need it to be there for offset calculation.
          blocks.push(React.createElement(TimeBlock, {
            key: 'timeblock-' + item.id + '-v' + ver,
            dataId: item.id,
            color: item.color,
            item: item,
            start: item.start,
            end: item.end,
            rightMargin: rightMargin * 10,
            leftMargin: leftMargin * 10,
            y: idx * sliceHeight + startOffset * sliceHeight,
            height: blockHeight * sliceHeight,
            itemContentRenderer: _this7.props.itemContentRenderer,
            onStartResize: onStartResize,
            onEndResize: onEndResize
          }));
        });
      }

      idx++;
    };

    for (var t = moment(startTime); t.isBefore(endTime); t.add(zoomMinutes, "minutes")) {
      _loop(t);
    }

    return React.createElement(
      'div',
      { className: 'time-line', ref: this.reference },
      slices,
      blocks
    );
  };

  return Timeline;
}(PureComponent), _class2.defaultProps = {
  zoom: 0,
  timeHeader: null,
  contentHeader: null
}, _temp2);

Timeline.propTypes = process.env.NODE_ENV !== "production" ? {
  /**
   * Zoom level of time line. 0 = 1 Hour, 1 = 30 minutes, 2 = 15 minutes, 3 = 10 minutes, 4 = 5 minutes, 5 = 1 minute
   * @prop {PropTypes} propTypes.zoom
   */
  zoom: PropTypes.oneOf([0, 1, 2, 3, 4, 5]),
  /**
   * Header string or component to render over the time column.
   * Note that this row is of fixed size atm and your component shouldn't stretch or shrink it.
   * If you need more than the current height, render the columns outside of the component.
   */
  timeHeader: PropTypes.node,
  /**
   * Header string or component to render over timeline content column
   * Note that this row is of fixed size atm and your component shouldn't stretch or shrink it.
   * If you need more than the current height, render the columns outside of the component.
   */
  contentHeader: PropTypes.node,
  /**
   * Array of time slices. The object must contain an id and start and end time measurements using
   * the momentsjs library.
   */
  items: PropTypes.arrayOf(ItemProp).isRequired,
  /**
   * Item renderer function called for each time slice's content.
   * @callback itemContentRenderer
   * @param {object} item
   * @return {React.component}
   */
  itemContentRenderer: PropTypes.func.isRequired,
  onTimeBlockChange: PropTypes.func.isRequired
} : {};
export default Timeline;