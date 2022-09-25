import React from 'react';

import './sass/Toolbar.sass';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'

class Toolbar extends React.Component {
	constructor(props) {
		super(props);
		this.state = {};
	}

	render() {
		return (
			<div className="toolbarWrapper">
				<div className="toolbar">
                    {this.props.data.map(button => {
    					return <this.ToolbarButton key={button.id} data={button} />
                    })}
				</div>
			</div>
		);
	}

	ToolbarButton = ({data}) => {
		if (typeof data.name == 'undefined') {
			return (
				<button onClick={() => this.buttonClick(data)} className={'button type-button'}>
					<FontAwesomeIcon icon={faPlus} />
				</button>
			);
		} else {
			return (
				<button onClick={() => this.buttonClick(data)} className={'button hasContent type-'+data.type} style={{boxShadow:'0 0 7px 0 '+data.color}}>
					{data.name}
				</button>
			);
		}
		
	}

	buttonClick(data) {
		console.log('buttonClick', data)
	}

}

export default Toolbar;