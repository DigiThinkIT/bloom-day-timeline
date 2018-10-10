import "./styles.less";
import React, {PureComponent} from 'react'
import moment from 'moment';
import 'element-closest';
import PropTypes from 'prop-types';
import momentPropTypes from 'react-moment-proptypes';

export const ItemProp = PropTypes.shape({
  /**
   * An id to track this item's state
   */
  id: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
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
export const ZOOMLEVELS = [60, 30, 15, 10, 5, 1];

/**
 * Searches a base element for all of its "selector" children(recursive) that lay under x, y.
 * @param {DOMDElement} base Base Element to start the search
 * @param {int} x X position the matching elements must contain.
 * @param {int} y Y position the matching elements must contain.
 * @param {string} selector A css selector to search under base.
 */
const findElementsUnderPoint = (base, x, y, selector) => {
  if ( !selector ) selector = "*";

  return Array.from(base.querySelectorAll(selector)).reduce((acc, el) => {
    let rect = el.getBoundingClientRect();
    if ( x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom ) {
      acc.push(el);
    }

    return acc;
  }, []);

}

/**
 * Rounds down provided moment by interval minutes
 * @param {moment} m Moment value to round down
 * @param {int} interval An interval in minutes (1-60) to round to.
 * @returns {moment}
 */
export const nearestMinutesDown = (m, interval) => {
  const tmp = Math.floor(m.minute() / interval) * interval;
  return m.clone().minute(tmp).second(0);
}

/**
 * Rounds up provided moment by interval minutes
 * @param {moment} m Moment value to round up
 * @param {int} interval An interval in minutes (1-60) to round to.
 * @returns {moment}
 */
export const nearestMinutesUp = (m, interval) => {
  const tmp = Math.ceil(m.minute() / interval) * interval;
  return m.clone().minute(tmp).second(0);
}

/**
 * Finds start and end time extremes in passed items. Used to stretch the timeline to display items
 * with times in between days.
 * @param {moment} startTime The low time bound
 * @param {moment} endTime The high time bound
 * @param {Array} items An array of items { start: <moment>, end: <moment> }
 * @param {int} roundTo An integer interval to round to (1-60) measured in minutes.
 * @returns {object} Returns { starTime: <moment>, endTime: <moment> }
 */
export const findStartEndTime = (startTime, endTime, items, roundTo) => {
  let result = {
    startTime,
    endTime
  }

  items.forEach(item => {
    if ( item.start.isBefore(result.startTime) ) {
      result.startTime = nearestMinutesDown(item.start, roundTo);
    }

    // as a precaution we check item time length so that we can test the end
    // time far enough so accomodate short blocks(since they have a min-height)
    // here we use roundTo * 3 to add to the end extreme check.
    let timeLength = moment.duration(item.end.diff(item.start, "minutes"), "minutes", true).asMinutes();
    let end = item.end;
    if ( roundTo >= 30 && timeLength < roundTo * 3 ) {
      end = end.clone().add(roundTo * 2, "minutes");
    }

    if ( end.isAfter(result.endTime) ) {
      result.endTime = nearestMinutesUp(end, roundTo);
    }
  });

  return result;
}

/**
 * Simple timeline label component. Prints times along the timeline.
 * @param {object} props 
 */
const TimeLabel = (props) => {
  const { time, format="hh:mm a" } = props;
  return <div className="time-label">{time.format(format)}</div>
}

TimeLabel.propTypes = {
  /**
   * A time measure used to label a slice.
   */
  time: PropTypes.instanceOf(moment).isRequired,
  /**
   * The time formatting used to render a label slice.
   */
  format: PropTypes.string
};

TimeLabel.defaultProps = {
  format: "hh:mm a"
};

/**
 * A dragable component used as a resize handles on the TimeBlock component.
 */
class ResizeHandle extends PureComponent {

  /**
   * @static {object} propTypes ReactJS Prop Type Definition
   */
  static propTypes = {
    /**
     * @prop {string} className Extra className to use on our component
     */
    className: PropTypes.string
  }

  constructor(props) {
    super(props);

    /**
     * DOMElement reference to this component
     */
    this.reference = React.createRef();

    /**
     * @property {object} eventHandlers Mouse event handlers to track dom events outside of react.
     * @param {function} eventHandlers.onMouseMove The mousemove dom event handler
     * @param {function} eventHandlers.onMouseDown The mousedown dom event handler
     * @param {function} this.eventHandlers.onMouseUp The mouseup dom event handler
     */
    this.eventHandlers = {
      onMouseMove: this.onMouseMove.bind(this),
      onMouseDown: this.onMouseDown.bind(this),
      onMouseUp: this.onMouseUp.bind(this)
    }

    /**
     * @property {bool} Tracks mouse down state
     */
    this.mouseDown = false;
    /**
     * @property {int} moveY The vertical offset movement from the original y position
     */
    this.moveY = null;
    /**
     * @property {int} originY The original y position before mouse dragging starts
     */
    this.originY = null;
  }

  /**
   * Tracks mouse movement outside of react
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseDown(e) {
    const { canDrag = true } = this.props.item;

    if ( canDrag) {
      const rect = this.reference.current.getBoundingClientRect();
      this.mouseDown = true;
      this.originY = rect.top;
      e.cancelBubble = true;
    }
  }

  /**
   * Tracks mouse up event outside of react. 
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseUp(e) {
    if ( this.mouseDown && this.originY !== null ) {
      const dy = e.clientY - this.originY;
      const y = this.originY + dy;
      this.mouseDown = false;
      this.moveY = null;
      if ( typeof this.props.onMove === 'function' ) this.props.onApplyResize(y, dy, this.reference.current.clientHeight);
      e.cancelBubble = true;
    }
  }

  /**
   * Tracks mouse move event outside of react. 
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseMove(e) {
    if ( this.mouseDown ) {
      const dy = e.clientY - this.originY;
      this.moveY = this.originY + dy;
      if ( typeof this.props.onMove === 'function' ) this.props.onMove(this.moveY, dy, this.reference.current.clientHeight);
      e.cancelBubble = true;
    }
  }

  /**
   * React did mount hook. We use it to setup event handlers on the dom outside of react.
   */
  componentDidMount() {
    if ( this.reference ) {
      const handle = this.reference.current;
      handle.addEventListener("mousedown", this.eventHandlers.onMouseDown);
      handle.addEventListener("touchstart", this.eventHandlers.onMouseDown);
      // mouse move and dropping handled on body
      document.body.addEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.addEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.addEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  }

  /**
   * React will ummount hook. We use it to clean up event handlers on the dom setup previously.
   */
  componentWillUnmount() {
    if ( this.reference ) {
      const handle = this.reference.current;
      handle.removeEventListener("mousedown", this.eventHandlers.onMouseDown);
      handle.removeEventListener("touchstart", this.eventHandlers.onMouseDown);
      document.body.removeEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  }

  render() {
    return <div className={ [(this.props.className || ""), "handler"].join(" ") } ref={this.reference}>=</div>
  }
}

class TimeBlock extends PureComponent {

  static propTypes = {
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
    dataId: PropTypes.oneOfType([
      PropTypes.string,
      PropTypes.number
    ]), 
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
  }

  static defaultProps = {
    rightMargin: 0,
    leftMargin: 0
  }

  constructor(props) {
    super(props);
    this.reference = React.createRef();

    /**
     * @property {object} state Component State
     * @property {int} state.update An update version counter to force refresh component.
     */
    this.state = {
      update: 0
    };
  }

  /**
   * 
   * @param {string} side Either "start" or "end" flags to triger resizing top or bottom of the block.
   * @param {int} y The y position of the resize element while dragging.
   * @param {int} dy The offset position of the resize element relative to its last location.
   * @param {int} height The height of the resize element.
   * @param {bool} apply When true, the resize measurements should be applied to the block and updated upstream.
   */
  onLiveResize(side, y, dy, height, apply) {
    if ( typeof apply === 'undefined' ) apply = false;

    if ( side == "start" ) {
      if ( apply ) {
        // let timeline re-render and setup size
        this.props.onStartResize(this.props.dataId, dy, () => this.setState(prevState => ({ update: prevState.update + 1})));  
        this.reference.current.style.zIndex = 'auto';
      } else {
        this.reference.current.style.top = `${this.props.y + dy}px`;
        this.reference.current.style.height = `${this.props.height - dy}px`;
        this.reference.current.style.zIndex = 10;
      }
    } else if ( side == "end" ) {
        if ( apply ) {
        // let timeline re-render and setup size
        this.props.onEndResize(this.props.dataId, dy + height, () => this.setState(prevState => ({ update: prevState.update + 1})));  
        this.reference.current.style.zIndex = 'auto';
      } else {
        // we want to adjust the block height based on the handler's bottom offset
        this.reference.current.style.height = `${this.props.height + dy - height}px`;
        this.reference.current.style.zIndex = 10;
      }
    }
  }

  render() {
    const { color, height, y, dataId, itemContentRenderer, item, rightMargin=0, leftMargin=0 } = this.props;
    const { canResize = true } = item;
    const onTopHandleMove = (y, dy, height) => this.onLiveResize('start', y, dy, height);
    const onBottomHandleMove = (y, dy, height) => this.onLiveResize('end', y, dy, height);
    const onTopHandleApply = (y, dy, height) => this.onLiveResize('start', y, dy, height, true);
    const onBottomHandleApply = (y, dy, height) => this.onLiveResize('end', y, dy, height, true);

    return <div 
      key={`block-update-${this.state.update}`}
      data-id={dataId}
      style={{ 
        top: y, 
        height: height, 
        minHeight: 30, 
        marginRight: rightMargin, 
        marginLeft: leftMargin,
        backgroundColor: color
      }} 
      className="time-block"
      ref={this.reference}
    >
      { canResize && (
        <ResizeHandle className="top" onMove={onTopHandleMove} onApplyResize={onTopHandleApply} />
      )}
      <div className="content">{itemContentRenderer(item)}</div>
      { canResize && (
        <ResizeHandle className="bottom" onMove={onBottomHandleMove} onApplyResize={onBottomHandleApply}/>
      )}
    </div>
  }
}

/**
 * Timeline component. Displays a timeline from start to end time including custom items placed in this timeline.
 * @class Timeline
 */
export class Timeline extends PureComponent {
  /**
   * @prop {object} propTypes Timeline react props
   * @static
   */
  static propTypes = {
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
  }

  static defaultProps = {
    zoom: 0,
    timeHeader: null,
    contentHeader: null,
  }

  constructor(props) {
    super(props);

    this.reference = React.createRef();

    this.state = {
      itemUpdates: {}
    }

    this.eventHandlers = {
      onMouseMove: this.onMouseMove.bind(this),
      onMouseDown: this.onMouseDown.bind(this),
      onMouseUp: this.onMouseUp.bind(this)
    }

    this.moveBlock = null;
    this.moveBlockOriginRect = null;
    this.mouseMoveOrigin = null;
    this.moveBlockNewY = null;
  }

  /**
   * Tracks mouse down event outside of react
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseDown(e) {
    let x = e.clientX,
        y = e.clientY;

    // we only care about blocks, so we can lock a mouse down event
    // while adjusting time would be done on onMouseMove
    let blocks = findElementsUnderPoint(this.reference.current, x, y, ".time-block");
    if ( blocks.length > 0 ) {
      // sort blocks by computed z-index so we can pick the top most block
      blocks.sort((a, b) => {
        let az = parseInt(window.getComputedStyle(a).zIndex) || 0;
        let bz = parseInt(window.getComputedStyle(b).zIndex) || 0;
        return bz - az;
      });
      this.moveBlock = blocks[0];
      this.moveBlockOriginRect = this.moveBlock.getBoundingClientRect();
      this.mouseMoveOrigin = { x, y };
    }

    this.reference.current.style.zIndex=10;
    e.cancelBubble = true;
  }

  /**
   * Tracks mouse up event outside of react
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseUp(e) {
    // require both a selected block and movement to run any of this
    // code, as we don't want blocks to reset on just clicks.
    if ( this.moveBlock && this.moveBlockNewY ) {
      const { 
        timeHeader,
        contentHeader,
        zoom=0,
        sliceHeight=20,
        items
      } = this.props;
      const zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length?ZOOMLEVELS[zoom]:1;
      let { startTime = moment().startOf("day"), endTime = moment().endOf("day") } = this.props;
      ({ startTime, endTime } = findStartEndTime(startTime, endTime, items, zoomMinutes));

      const startScale = ((this.moveBlockNewY - (( timeHeader || contentHeader )?sliceHeight:0)) / sliceHeight) * zoomMinutes;
      const start = startTime.clone().add(Math.floor(startScale / zoomMinutes) * zoomMinutes , "minutes");
      const origItem = this.props.items.find((itm) => itm.id.toString() === this.moveBlock.dataset.id.toString());
      const blockLengthinMinutes = moment.duration(origItem.end.diff(origItem.start, "minutes"), "minutes", true).asMinutes()

      let item = Object.assign({}, origItem, {
        start,
        end: start.clone().add(blockLengthinMinutes, "minutes")
      });

      // Important: Resetting these vars needs to happen before the callback
      //            A rendering process could happen before the callback returns
      //            causing issues with mouseMove events triggering before reset.
      this.moveBlock = null;
      this.moveBlockNewY = null;
      e.cancelBubble = true;
      if ( typeof this.props.onTimeBlockChange === 'function' ) this.props.onTimeBlockChange(item);
      this.reference.current.style.zIndex=1;
      this.setState(prevState => ({
        itemUpdates: { ...prevState.itemUpdates, [item.id]: (prevState.itemUpdates[item.id] || 0) + 1 }
      }))
    } else {
      this.moveBlock = null;
      this.moveBlockNewY = null;
    }

  }

  /**
   * Tracks mouse movement outside of react
   * @param {MouseEvent} e MouseEvent object
   */
  onMouseMove(e) {
    if ( this.moveBlock ) {
      let thisRect = this.reference.current.getBoundingClientRect();
      let dy = e.clientY - this.mouseMoveOrigin.y;
      // new position is based on position before moving + offset - the top position of this timeline element on the page.
      this.moveBlockNewY = this.moveBlockOriginRect.top + dy - thisRect.top;
      this.moveBlock.style.top = `${this.moveBlockNewY}px`;
      e.cancelBubble = true;
    }
  }

  /**
   * Callback used by TimeBlock to trigger time resize started by user dragging behaviour
   * @param {*} id The item id to map this resize event
   * @param {*} dy The y offset of the resize event
   * @param {*} done A callback to trigger TimeBlock render reset(due to dom changes vs virtual dom)
   */
  onBlockStartResize(id, dy, done) {
    const { 
      sliceHeight=20,
      zoom=0,
    } = this.props;
    const zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length?ZOOMLEVELS[zoom]:1;
    const origItem = this.props.items.find((itm) => itm.id.toString() === id.toString());
    const timeScale = (dy / sliceHeight) * zoomMinutes;
    const diffTime = Math.floor(timeScale / zoomMinutes) * zoomMinutes; 
    const start = nearestMinutesDown(origItem.start.clone().add(diffTime, "minutes"), zoomMinutes);
    let end = origItem.end.clone()

    if ( start.isAfter(end) ) {
      end = start.clone().add(zoomMinutes, "minutes");
    }

    const item = Object.assign({}, origItem, {
      start,
      end
    });

    done()
    if ( typeof this.props.onTimeBlockChange === 'function' ) this.props.onTimeBlockChange(item);
  }

  /**
   * Callback used by TimeBlock to trigger time resize started by user dragging behaviour
   * @param {*} id The item id to map this resize event
   * @param {*} dy The y offset of the resize event
   * @param {*} done A callback to trigger TimeBlock render reset(due to dom changes vs virtual dom)
   */
  onBlockEndResize(id, dy, done) {
    const { 
      sliceHeight=20,
      zoom=0,
    } = this.props;
    const zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length?ZOOMLEVELS[zoom]:1;
    const origItem = this.props.items.find((itm) => itm.id.toString() === id.toString());
    const timeScale = (dy / sliceHeight) * zoomMinutes;
    const diffTime = Math.floor(timeScale / zoomMinutes) * zoomMinutes; 
    let end = nearestMinutesDown(origItem.end.clone().add(diffTime, "minutes"), zoomMinutes);

    // don't allow end time to go negative
    if ( end.isBefore(origItem.start) ) {
      end = origItem.start.clone().add(zoomMinutes, "minutes");
    }


    const item = Object.assign({}, origItem, {
      end
    });

    done()
    if ( typeof this.props.onTimeBlockChange === 'function' ) this.props.onTimeBlockChange(item);
  }

  /**
   * Component did mount hook. We setup dom events outside of react here.
   */
  componentDidMount() {
    if ( this.reference ) {
      const timeline = this.reference.current;
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
  }

  /**
   * Component will unmount. Used to clean up previously set dom events.
   */
  componentWillUnmount() {
    if ( this.reference ) {
      const timeline = this.reference.current;
      // cleanup
      timeline.removeEventListener("mousedown", this.eventHandlers.onMouseDown);
      timeline.removeEventListener("touchstart", this.eventHandlers.onMouseDown);
      document.body.removeEventListener("mouseup", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("touchend", this.eventHandlers.onMouseUp);
      document.body.removeEventListener("mousemove", this.eventHandlers.onMouseMove);
    }
  }

  /**
   * Component did update(after render). Used to reset mouse dragging state(sanity check)
   */
  componentDidUpdate() {
    this.moveBlock = null;
  }

  render() {
    const { 
      zoom=0,
      timeFormatting="hh:mm a",
      timeHeader,
      contentHeader,
      sliceHeight=20,
    } = this.props;
    let { startTime = moment().startOf("day"), endTime = moment().endOf("day") } = this.props;
    const zoomMinutes = zoom >= 0 && zoom < ZOOMLEVELS.length?ZOOMLEVELS[zoom]:1;
    const slices = [];
    const blocks = [];
    const onStartResize = (id, dy, done) => this.onBlockStartResize(id, dy, done);
    const onEndResize = (id, dy, done) => this.onBlockEndResize(id, dy, done);
    let idx = 0;

    // clone and sort items so we can remove items as we build our blocks
    let items = (this.props.items || []).slice(0).sort((a, b) => a.start.diff(b.start));
    const origStartTime = startTime.clone();
    const origEndTime = endTime.clone();
    ({ startTime, endTime } = findStartEndTime(startTime, endTime, items, zoomMinutes));

    // inject headers if client provided them
    if ( timeHeader || contentHeader ) {
      idx++;
      slices.push(<div 
        key="headers" 
        className="time-slice header" 
        style={{ 
          height: `${sliceHeight}px`, 
          lineHeight: `${sliceHeight}px` 
        }}
      >
        <div className="time-label">{ timeHeader }</div>
        <div className="time-content">{ contentHeader }</div>
      </div>);
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
    const createNode = (item) => ({
      id: item.id,
      leftMargin: 0,
      rightMargin: 0,
      item,
      parents: [],
      children: []
    });
    /**
     * Simple helper to build a node in the tree structure.
     * @param {object} tree 
     * @param {object} item 
     */
    const findNode = (tree, item) => {
      if ( !Reflect.has(tree, item.id) ) {
        let node = createNode(item);
        Reflect.set(tree, node.id, node);
        return node;
      }
      return Reflect.get(tree, item.id);
    }
    /**
     * Recursively counts parent links to create the right margin of any node representing an item.
     */
    const accumulatedRightMargin = (node) => {
      if ( !node ) return 0;

      let result = 0;
      if ( node.parent ) result += 1 + accumulatedRightMargin(node.parent);
      return result;
    };
    /**
     * Counts nested children inside a node to build left margin.
     * @param {object} node A node representing an item
     * @param {int} max The margin counter
     */
    const accumulatedLeftMargin = (node, max) => {
      let result = max;
      node.children.forEach(child => {
        result = +accumulatedLeftMargin(child, result+1);
      })
      return result;
    };
    /**
     * Helper function, used to figure out if a node already exists in the parent/child chain
     * This is used to prevent infinite loops while building margins so a child only appears
     * once in the chain.
     */
    const isNodeAlreadyInChain = (parent, node) => {
      if ( parent == node || parent.parent == node || node.parent == parent ) {
        return true;
      } else if ( parent.children.indexOf(node) > -1 ) {
        return true;
      } else if ( parent.parent ) {
        return isNodeAlreadyInChain(parent.parent, node);
      }
      return false;
    }
    // margins is our tree structure, we'll use it as an in memory dictionary to quickly find
    // find our data.
    const margins = {};
    items.reverse().forEach(parent => {
      let parentNode = findNode(margins, parent);

      items.forEach(child => {
        if ( parent.id != child.id ) {
          if ( child.start.isBetween(parent.start, parent.end, "minutes", "[)") ) {
            let childNode = findNode(margins, child);
            // if we have a parent check if this new parent is closer.
            // if so, then we'll make it the child's new parent
            if ( childNode.parent ) {
              let currentParentDiff = childNode.item.start.diff(childNode.parent.item.start, "minutes");
              let newParentDiff = childNode.item.start.diff(parentNode.item.start, "minutes");
              if ( newParentDiff < currentParentDiff ) {
                if ( !isNodeAlreadyInChain(parentNode, childNode) ) {
                  // make sure to remove child from old parent if we are re-parenting.
                  childNode.parent.children = childNode.parent.children.filter(c => c.id !== childNode.id);
                  childNode.parent = parentNode;
                  childNode.parent.children.push(childNode);
                }
              }
            } else {
              if ( !isNodeAlreadyInChain(parentNode, childNode) ) {
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
    Object.values(margins).forEach(node => {
      node.rightMargin = accumulatedRightMargin(node);
    });
    Object.values(margins).forEach(node => {
      node.leftMargin = accumulatedLeftMargin(node, 0);
    });

    // build slice by zoom level
    for(let t = moment(startTime); t.isBefore(endTime); t.add(zoomMinutes, "minutes") ) {
      // simple extra className to fit separator styling
      let extraClass = ""
      if ( t.minutes() == 0 ) extraClass = "separator";
      if ( t.isBefore(origStartTime) ) extraClass += " yesterday";
      if ( t.isAfter(origEndTime) ) extraClass += " tomorrow";

      // build slice
      slices.push(<div 
        key={t.format("YYYY-MM-DD hh:mm:ss a")}
        style={{ height: `${sliceHeight}px`, lineHeight: `${sliceHeight}px` }}
        className={`time-slice ${extraClass}`}
      >
        <TimeLabel 
          time={t.clone()}
          format={timeFormatting}
        />
      </div>);

      // run through items checking if they start inside this slice.
      // we'll use sumed slice height up to this point to position our block
      let foundItems = items.filter((i) => {
        return i.start.isBetween(t, t.clone().add(zoomMinutes, "minutes"), 'minute', '[)')
      });
      if ( foundItems.length > 0 ) {
        foundItems.forEach(item => {
          let node = findNode(margins, item);
          let rightMargin = node.rightMargin;
          let leftMargin = node.leftMargin;

          // find distance from current slice time to this item start time
          // and round to the nearest zoomMinutes up and down
          let tmpStart = nearestMinutesDown(item.start, zoomMinutes);
          let tmpEnd = nearestMinutesUp(item.end, zoomMinutes);
          let startDiff = moment.duration(tmpStart.diff(t, "minutes"), "minutes", true).asMinutes();
          // Calculates end time rounding so that anything landing between zoomMinutes and (zoomMinutes * 2) - 1
          // will occupy the entire slice height.
          let offset = Math.abs((item.start.diff(item.end, "minutes")) / zoomMinutes) % 1; // fast way of extracting decimal value
          // when offset is 0, we want to move our offset by one zoom increment.
          // ex: end is 3:00 and zoom is 60 Minutes, we actually want 4:00 so that visually 
          // we are using the entire slice.
          let correction = ( offset == 0 )?zoomMinutes:0;
          let blockLegth = moment.duration(tmpEnd.diff(tmpStart, "minutes") + correction, "minutes", true).asMinutes();
          let startOffset = startDiff / zoomMinutes;  // scale offset to place block
          let blockHeight = blockLegth / zoomMinutes; // block height scale to calc height

          // Because we modify the DOM outside of react(to simplify mouse handling and only update when necessary)
          // we keep an item update version number so we can re-key our blocks, forcing a re-render and refresh of
          // styles which would have been kept unseen by react.
          let ver = 0;
          if ( item.id in this.state.itemUpdates ) {
            ver = this.state.itemUpdates[item.id];
          }

          // Note: We include the header in the idx count because the timeline element contains everything.
          //       So we need it to be there for offset calculation.
          blocks.push(<TimeBlock 
            key={`timeblock-${item.id}-v${ver}`}
            dataId={item.id}
            color={item.color}
            item={item}
            start={item.start}
            end={item.end}
            rightMargin={rightMargin * 10}
            leftMargin={leftMargin * 10}
            y={(idx * sliceHeight) + (startOffset * sliceHeight)}
            height={blockHeight * sliceHeight}
            itemContentRenderer={this.props.itemContentRenderer}
            onStartResize={onStartResize}
            onEndResize={onEndResize}
          />);
        });
      }

      idx++;
    }

    return <div className="time-line" ref={this.reference}>
      {slices}
      {blocks}
    </div>
  }
}

export default Timeline;