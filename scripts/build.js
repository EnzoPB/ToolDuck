const { MSICreator } = require('electron-wix-msi');
const path = require('path');
const fs = require('fs');

const package = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'package.json')));

const msiCreator = new MSICreator({
	appDirectory: path.resolve(__dirname, '..', 'dist', 'ToolDuck-win32-x64'),
	outputDirectory: path.resolve(__dirname, '..', 'dist'),

	description: package.description,
	exe: package.name,
	name: package.displayName,
	manufacturer: package.author,
	version: package.version,
	language: 1036,

	ui: {
		chooseDirectory: true,
		images: {
			background: path.resolve(__dirname, '..', 'installer_images', 'background.png'),
			banner: path.resolve(__dirname, '..', 'installer_images', 'banner.png')
		}
	},
});

async function build() {
	await msiCreator.create();
	await msiCreator.compile();
}

build().catch(console.error);