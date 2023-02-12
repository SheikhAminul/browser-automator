async function doDelay(milliseconds: number) {
	return new Promise(onDone => setTimeout(onDone, milliseconds))
}

async function cropImageOffscreen(image: ImageBitmap, width: number, height: number, left: number, top: number) {
	var canvas = new OffscreenCanvas(width, height)
	var context = canvas.getContext('2d') as any
	context.drawImage(image, left, top, width, height, 0, 0, width, height)
	return canvas
}

async function imageBitmapFromUrl(url: string) {
	return await fetch(url)
		.then(response => response.blob())
		.then(async blob => createImageBitmap(blob))
}

async function blobToDataUrl(blob: Blob) {
	return new Promise(onDone => {
		let fileReader = new FileReader()
		fileReader.onload = function () {
			onDone(this.result)
		}
		fileReader.readAsDataURL(blob)
	})
}

function fileToBlob(file: File) {
	return new Blob([file], { type: file.type })
}

function getRandomFromArray(array: any[]) {
	return array[Math.floor(Math.random() * array.length)]
}

function triggerEvent(element: any, type: string) {
	element.dispatchEvent(
		new Event(type, {
			bubbles: true,
			cancelable: true
		})
	)
}

function setValue(element: { tagName: string; value: any; innerHTML: any }, value: any) {
	if (element.tagName.match(/INPUT|TEXTAREA|SELECT/i)) element.value = value
	else element.innerHTML = value
	triggerEvent(element, 'focus')
	triggerEvent(element, 'keydown')
	triggerEvent(element, 'keypress')
	triggerEvent(element, 'keyup')
	triggerEvent(element, 'input')
	triggerEvent(element, 'change')
	triggerEvent(element, 'blur')
}

export { doDelay, cropImageOffscreen, imageBitmapFromUrl, blobToDataUrl, getRandomFromArray, triggerEvent, setValue }