/**
 * Delays execution for the specified number of milliseconds.
 *
 * @param {number} milliseconds - The duration of the delay in milliseconds.
 * @returns {Promise<void>}
 */
const doDelay = async (milliseconds: number): Promise<void> => {
	return new Promise(onDone => setTimeout(onDone, milliseconds))
}

/**
 * Crops an offscreen image.
 *
 * @param {ImageBitmap} image - The image to crop.
 * @param {number} width - The width of the cropped area.
 * @param {number} height - The height of the cropped area.
 * @param {number} left - The left position of the cropped area.
 * @param {number} top - The top position of the cropped area.
 * @returns {OffscreenCanvas} - The cropped image as an OffscreenCanvas.
 */
const cropImageOffscreen = (image: ImageBitmap, width: number, height: number, left: number, top: number): OffscreenCanvas => {
	var canvas = new OffscreenCanvas(width, height)
	var context = canvas.getContext('2d') as any
	context.drawImage(image, left, top, width, height, 0, 0, width, height)
	return canvas
}

/**
 * Creates an ImageBitmap from a given image URL.
 *
 * @param {string} url - The URL of the image.
 * @returns {Promise<ImageBitmap>} - The created ImageBitmap.
 */
const imageBitmapFromUrl = async (url: string): Promise<ImageBitmap> => {
	return await fetch(url).then(response => response.blob()).then(async blob => createImageBitmap(blob))
}

/**
 * Converts a Blob to a data URL.
 *
 * @param {Blob} blob - The Blob to convert.
 * @returns {Promise<string>} - The data URL representing the Blob.
 */
const blobToDataUrl = async (blob: Blob) => {
	return new Promise(onDone => {
		let fileReader = new FileReader()
		fileReader.onload = function () {
			onDone(this.result)
		}
		fileReader.readAsDataURL(blob)
	})
}

/**
 * Converts a File to a Blob.
 *
 * @param {File} file - The File to convert.
 * @returns {Blob} - The converted Blob.
 */
const fileToBlob = (file: File): Blob => {
	return new Blob([file], { type: file.type })
}

/**
 * Retrieves a random element from an array.
 *
 * @param {any[]} array - The array from which to select a random element.
 * @returns {any} - The randomly selected element from the array.
 */
const getRandomFromArray = (array: any[]): any => {
	return array[Math.floor(Math.random() * array.length)]
}

/**
 * Triggers a DOM event on the specified element.
 *
 * @param {any} element - The DOM element on which to trigger the event.
 * @param {string} type - The type of event to trigger.
 */
const triggerEvent = (element: any, type: string) => {
	element.dispatchEvent(
		new Event(type, {
			bubbles: true,
			cancelable: true
		})
	)
}

/**
 * Sets a value for an HTML element and triggers input-related events.
 *
 * @param {{ tagName: string; value: any; innerHTML: any }} element - The HTML element to set the value on.
 * @param {any} value - The value to set on the element.
 */
const setValue = (element: { tagName: string; value: any; innerHTML: any }, value: any) => {
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

/**
 * Omits specified properties from an object.
 *
 * @template T
 * @param {T} item - The object to omit properties from.
 * @param {keyof T} keys - The properties to omit from the object.
 * @returns {Partial<T>} - A new object with omitted properties.
 */
const omitProperties = <T extends Record<string, any>>(item: T, keys: (keyof T)[]): Partial<T> => {
	return Object.fromEntries(Object.entries(item).filter(([key]) => !keys.includes(key as keyof T))) as Partial<T>
}

/**
 * Chooses specified properties from an object.
 *
 * @template T
 * @param {T} item - The object to choose properties from.
 * @param {keyof T} keys - The properties to choose from the object.
 * @returns {Partial<T>} - A new object with chosen properties.
 */
const chooseProperties = <T extends Record<string, any>>(item: T, keys: (keyof T)[]): Partial<T> => {
	return Object.fromEntries(Object.entries(item).filter(([key]) => keys.includes(key as keyof T))) as Partial<T>
}

export { doDelay, cropImageOffscreen, imageBitmapFromUrl, blobToDataUrl, getRandomFromArray, triggerEvent, setValue, omitProperties, chooseProperties }