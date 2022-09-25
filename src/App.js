import Header from './Header';
import Toolbar from './Toolbar';
import './sass/App.sass';

var toolbarData = [
	{
		id: 0,
		name: 'ttt',
		type: 'button',
		color: '#00aa10'
	},
	{
		id: 1
	},
	{
		id: 2
	},
	{
		id: 3
	},
	{
		id: 4
	},
	{
		id: 5
	}
]

function App() {
	return (
		<div className="App">
			<Header controllerStatus={0} />
			<Toolbar data={toolbarData} />
		</div>
	);
}

export default App;
