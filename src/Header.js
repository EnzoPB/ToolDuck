import React from 'react';

import './sass/Header.sass';
import Button from './components/Button';
import { faGear } from '@fortawesome/free-solid-svg-icons'

class Header extends React.Component {
	constructor(props) {
		super(props)
		this.state = {};
	}

	render() {
		return (
			<header>
				<Button icon={faGear} onClick={this.openSettings}>Settings</Button>
				
				<div className='controllerStatus'>
					Controller: {
						{
							0: <span className='status-red'>Disconnected</span>,
							1: <span className='status-yellow'>Connecting</span>,
							2: <span className='status-green'>Connected</span>
						}[this.props.controllerStatus]
					}
					<br />
					{this.props.controllerStatus == 0 &&
						<Button type='link' onClick={this.reconnect}>Reconnect</Button>
					}
				</div>
			</header>
		);
	}

	reconnect() {
		console.log('reconnect');
	}

	openSettings() {
		console.log('openSettings');
	}
}

export default Header;