import React, {Component} from 'react'
import {render} from 'react-dom'

import { Timeline } from '../../src'
import './styles.less'
import moment from 'moment'

const TimeBlockContentRenderer = (item) => {
  const { start, end } = item;
  return <React.Fragment>
      <div className="time-start">{start.format('hh:mm a')}</div>
      <div className="content">Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed sodales risus pharetra augue tincidunt, non porttitor sem porttitor. Curabitur maximus mi vel gravida consectetur. Maecenas quis magna finibus, placerat nisi viverra, eleifend tellus. Cras id laoreet erat. Integer consectetur lorem eget commodo iaculis. Duis aliquam diam ac arcu ultrices gravida. Ut vel mollis ex. Sed varius pellentesque tempor. Pellentesque nec diam ac neque condimentum laoreet eu a elit. Suspendisse id pharetra purus. Curabitur interdum dui at erat auctor dapibus. Duis tempor viverra porta.</div>
      <div className="time-end">{end.format('hh:mm a')}</div>
    </React.Fragment>
}

class Demo extends Component {

  constructor(props) {
    super(props);
    let items = [];
    let max = Math.floor(Math.random() * 5) + 2; // random # of items (2-6)
    let today = moment().startOf('day');
    let colors = ["orange", "lime", "#ababab", "pink"]

    // generate random entries
    for(let i=0; i < max; i++) {
      let start = today.clone().add(Math.floor(Math.random() * (20 * 60)), "minutes");
      let end = start.clone().add(Math.floor(Math.random() * (Math.floor(Math.random() * 4) + 2) * 60), "minutes");
      items.push({
        id: i,
        start,
        end,
        color: colors[i % colors.length]
      })
    }

    this.state = {
      zoom: 0,
      items
    }
  }

  handleZoomChange(event) {
    this.setState({
      zoom: parseInt(event.target.value)
    });
  }

  handleTimeBlockChange(item) {
    let items = this.state.items.slice(0);
    let idx = items.findIndex(itm => itm.id == item.id);
    if ( idx > -1 ) {
      items.splice(idx, 1, item);
      this.setState({
        items
      });
    }
  }

  render() {
    const onHandleZoomChange = (e) => this.handleZoomChange(e);
    const onTimeBlockChange = (item) => this.handleTimeBlockChange(item);

    return <div>
      <h1>Timeline Demo</h1>
      <label htmlFor="interval">Select your timeline interval zoom level: </label>
      <select id="interval" value={this.state.zoom} onChange={onHandleZoomChange}>
        <option value="0">1 Hour</option>
        <option value="1">30 Minutes</option>
        <option value="2">15 Minutes</option>
        <option value="3">10 Minutes</option>
        <option value="4">5 Minutes</option>
      </select>
      <div className="timeline-example">
        <Timeline 
          zoom={this.state.zoom}
          timeHeader="Time"
          contentHeader="Schedule"
          items={this.state.items}
          itemContentRenderer={TimeBlockContentRenderer}
          onTimeBlockChange={onTimeBlockChange}
        />
      </div>
    </div>
  }
}

render(<Demo/>, document.querySelector('#demo'))
