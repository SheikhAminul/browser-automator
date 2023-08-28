import { blobToDataUrl, cropImageOffscreen, doDelay, imageBitmapFromUrl } from './library'

declare global {
	interface Window {
		elementCatcher: any
		manualClickPreventer: any
		transmittedFiles: any
	}
}

interface WaitOptions {
	tryLimit?: number
	delay?: number
}

export default class Page {
	async goto(url: string, { waitUntil }: { waitUntil: 'load' | 'domcontentloaded' } = { waitUntil: 'domcontentloaded' }) {
		// GOTO TARGET URL
		await chrome.tabs.update(this.tabId, { url: 'about:blank' })
		await chrome.tabs.update(this.tabId, { url: url })

		// WAIT WHILE URL IS PENDING
		let tab
		if (waitUntil === 'load') {
			do {
				await doDelay(this.delay)
				tab = await chrome.tabs.get(this.tabId)
			} while (tab.pendingUrl === 'about:blank' || tab.url === 'about:blank')
		} else if ((waitUntil = 'domcontentloaded')) {
			do {
				await doDelay(this.delay)
				tab = await chrome.tabs.get(this.tabId)
			} while (tab.pendingUrl === 'about:blank' || tab.url === 'about:blank' || tab.status !== 'complete')
		}

		return true
	}
	async reload() {
		await this.goto(await this.url() as any)
		return true
	}
	async url() {
		const { url } = await chrome.tabs.get(this.tabId)
		return url
	}
	async close() {
		await chrome.windows.remove(this.windowId).catch(() => { })
		return true
	}
	async bringToFront() {
		return await chrome.windows.update(this.windowId, { focused: true })
	}
	async hideFromFront() {
		return await chrome.windows.update(this.windowId, { focused: false })
	}
	async evaluate(options: { args?: any[]; files?: string[]; func?: Function; world?: string }) {
		return (await chrome.scripting.executeScript({
			target: { tabId: this.tabId },
			world: 'ISOLATED',
			...options
		} as any))[0].result
	}
	async waitFor(func: Function, args: any, options: WaitOptions = {}) {
		return new Promise(async (onSuccess, onFailed) => {
			let valueReturned,
				tryLimit = options.tryLimit || this.tryLimit,
				delay = options.delay || this.delay
			while (!(valueReturned = await func(...args)) && tryLimit) {
				tryLimit--
				await doDelay(delay)
			}
			valueReturned ? onSuccess(valueReturned) : onFailed(valueReturned)
		})
	}
	async waitForNavigation(options = {}) {
		const lastUrl = await this.url()
		return await this.waitFor(async (lastUrl: string) => ((await this.url()) === lastUrl ? false : true), [lastUrl], options as any)
	}
	async waitForSelector(selectors: string, options: WaitOptions = {}, index?: number) {
		return await this.waitFor(
			async (options: any) => this.evaluate(options),
			[
				{
					func: (selectors: string, index: any) => (
						(
							isNaN(index) ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]
						) ? true : false
					),
					args: [selectors, index]
				}
			],
			options
		)
	}
	async waitForSelectorMiss(selectors: string, options: WaitOptions = {}, index?: number) {
		return await this.waitFor(
			async (options: any) => this.evaluate(options),
			[
				{
					func: (selectors: string, index: any) => (
						(
							isNaN(index) ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]
						) ? false : true
					),
					args: [selectors, index]
				}
			],
			options
		)
	}
	async waitForXPath(expression: any, options: WaitOptions = {}) {
		return await this.waitFor(
			async (options: any) => this.evaluate(options),
			[
				{
					func: (expression: string) => (document.evaluate(expression, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ? true : false),
					args: [expression]
				}
			],
			options
		)
	}
	async click(selectors: string, index?: number) {
		return new Promise(async (onSuccess, onFailed) => {
			(await this.evaluate({
				func: (selectors: string, index: any) => {
					const element = isNaN(index) ? (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
						) : (
							document.querySelector(selectors) as any
						)
					) : (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
						) : (
							document.querySelectorAll(selectors)[index] as any
						)
					)
					if (element) {
						element.scrollIntoView({ block: 'center', behavior: 'smooth' })
						element.click()
						return true
					} else return false
				},
				args: [selectors, index]
			})) ? onSuccess(true) : onFailed(false)
		})
	}
	async elementExists(selectors: string, index?: number) {
		return await this.evaluate({
			func: (selectors: string, index: number) => {
				const element = isNaN(index) ? (
					selectors.match(/^(\/|\.\/)/) ? (
						document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
					) : (
						document.querySelector(selectors) as any
					)
				) : (
					selectors.match(/^(\/|\.\/)/) ? (
						document.evaluate(selectors, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
					) : (
						document.querySelectorAll(selectors)[index] as any
					)
				)
				return element ? true : false
			},
			args: [selectors, index]
		})
	}
	execCopy(text: string) {
		const textarea = document.createElement('textarea')
		textarea.innerHTML = text
		document.body.appendChild(textarea)
		textarea.select()
		document.execCommand('copy')
		textarea.remove()
	}
	async execPasteTo(selectors: string, index?: number) {
		return new Promise(async (onSuccess, onFailed) => {
			(await this.evaluate({
				func: (selectors: string, index: number) => {
					const element = isNaN(index) ? (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
						) : (
							document.querySelector(selectors) as any
						)
					) : (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
						) : (
							document.querySelectorAll(selectors)[index] as any
						)
					)
					if (element) {
						element.scrollIntoView({ block: 'center', behavior: 'smooth' })
						element.focus()
						if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.select()
						document.execCommand('paste')
						return true
					} else return false
				},
				args: [selectors, index]
			})) ? onSuccess(true) : onFailed(false)
		})
	}
	async triggerEvent(selectors: string, type: any, index?: number) {
		return new Promise(async (onSuccess, onFailed) => {
			(await this.evaluate({
				func: (selectors: string, type: any, index: number) => {
					function triggerEvent(element: any, type: string) {
						element.dispatchEvent(
							new Event(type, {
								bubbles: true,
								cancelable: true
							})
						)
					}
					const element = isNaN(index) ? (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
						) : (
							document.querySelector(selectors) as any
						)
					) : (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
						) : (
							document.querySelectorAll(selectors)[index] as any
						)
					)
					if (element) {
						element.scrollIntoView({ block: 'center', behavior: 'smooth' })
						triggerEvent(element, type)
						return true
					} else return false
				},
				args: [selectors, type, index]
			})) ? onSuccess(true) : onFailed(false)
		})
	}
	async input(selectors: string, value: any, index?: number) {
		return new Promise(async (onSuccess, onFailed) => {
			(await this.evaluate({
				func: (selectors: string, value: any, index: number) => {
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
					const element = isNaN(index) ? (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
						) : (
							document.querySelector(selectors) as any
						)
					) : (
						selectors.match(/^(\/|\.\/)/) ? (
							document.evaluate(selectors, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
						) : (
							document.querySelectorAll(selectors)[index] as any
						)
					)
					if (element) {
						element.scrollIntoView({ block: 'center', behavior: 'smooth' })
						setValue(element, value)
						return true
					} else return false
				},
				args: [selectors, value, index]
			})) ? onSuccess(true) : onFailed(false)
		})
	}
	async uploadFiles(files: any, selectors: string, caughtElementIndex: number) {
		const executionWorld = caughtElementIndex ? 'MAIN' : 'ISOLATED'

		// SEND BASIC INFORMATIONS OF THE FILES
		const filesIndex = await this.evaluate({
			world: executionWorld,
			func: (files: any) => {
				if (!window.transmittedFiles) window.transmittedFiles = []
				return window.transmittedFiles.push(files) - 1
			},
			args: [files.map(({ fileName }: any, index: number) => Object.assign({ fileName: fileName }, files[index].blob && (files[index].blobUrl = URL.createObjectURL(files[index].blob)) ? { blobUrl: files[index].blobUrl } : { dataUrl: '' }))]
		})

		// TRANSMIT THE DATA URLS IN MULTIPLE CHUNKS IF THERE IS ANY
		for (let fileIndex = 0; fileIndex < files.length; fileIndex++)
			if (files[fileIndex].dataUrl) {
				let dataUrlSize = files[fileIndex].dataUrl.length,
					chunkSize = 5242880,
					currentPosition = 0
				while (currentPosition < dataUrlSize) {
					await this.evaluate({
						world: executionWorld,
						func: (filesIndex: number, fileIndex: number, dataUrlChunk: string) => {
							window.transmittedFiles[filesIndex][fileIndex].dataUrl += dataUrlChunk
						},
						args: [filesIndex, fileIndex, files[fileIndex].dataUrl.substr(currentPosition, chunkSize)]
					})
					currentPosition += chunkSize
				}
			}

		// UPLOAD THE FILE
		await this.evaluate({
			world: executionWorld,
			func: async (filesIndex: number, selectors: string, caughtElementIndex: number) => {
				// FUNCTIONS
				function filesToFileList(files: FileList) {
					const dataTransferer = new DataTransfer()
					for (const file of files) dataTransferer.items.add(file)
					return dataTransferer.files
				}
				function dataUrlToFile(dataUrl: string, fileName: string) {
					let [mime, data] = dataUrl.split(',')
					mime = (<any>mime).match(/:(.*?);/)[1]
					data = atob(data)
					let index = data.length,
						dataArray = new Uint8Array(index)
					while (index--) dataArray[index] = data.charCodeAt(index)
					return new File([dataArray], fileName, { type: mime })
				}
				function triggerEvent(element: any, type: string) {
					element.dispatchEvent(
						new Event(type, {
							bubbles: true,
							cancelable: true
						})
					)
				}
				function getBlob(url: string) {
					return new Promise(resolution => {
						var xhr = new XMLHttpRequest()
						xhr.open('GET', url, true)
						xhr.responseType = 'blob'
						xhr.onload = () => resolution(xhr.response)
						xhr.send()
					})
				}
				function blobToFile(blob: Blob, fileName: string) {
					return new File([blob], fileName, { type: blob.type })
				}
				// UPLOAD FILE
				const element = selectors ? (selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : document.querySelector(selectors)) : window.elementCatcher.elements[caughtElementIndex]
				if (element) {
					element.scrollIntoView({ block: 'center', behavior: 'smooth' })
					element.files = filesToFileList((await Promise.all(window.transmittedFiles[filesIndex].map(async ({ blobUrl, dataUrl, fileName }: any) => (blobUrl ? blobToFile((await getBlob(blobUrl)) as any, fileName) : dataUrlToFile(dataUrl, fileName))))) as any)
					triggerEvent(element, 'input')
					triggerEvent(element, 'change')
					// CLEAR TRANSMITTED DATA
					delete window.transmittedFiles[filesIndex]
					if (window.transmittedFiles.filter(Boolean).length === 0) delete window.transmittedFiles
					return true
				} else return false
			},
			args: [filesIndex, selectors, caughtElementIndex || '']
		})

		// REVOKE ALL BLOB URLS TO REMOVE REFERENCES
		files.forEach(({ blobUrl }: any) => URL.revokeObjectURL(blobUrl))
		return true
	}
	async screenshot({ clip }: { clip?: { x: number; y: number; width: number; height: number } }) {
		let dataUrl = await chrome.tabs.captureVisibleTab(this.windowId, { format: 'png' })
		if (clip) {
			const { width, height, x, y } = clip
			const croppedImage = await cropImageOffscreen(await imageBitmapFromUrl(dataUrl), width, height, x, y)
			dataUrl = (await blobToDataUrl(await (croppedImage as any).convertToBlob())) as string
		}
		return dataUrl
	}
	elementCatcher = {
		catch: async function (tagName: any) {
			return await this.evaluate({
				world: 'MAIN',
				func: (tagName: string) => {
					if (!window.elementCatcher) {
						window.elementCatcher = {
							originalFunc: document.createElement,
							elements: [],
							tagName: tagName.toUpperCase()
						}
						document.createElement = function () {
							const element = window.elementCatcher.originalFunc.apply(this, arguments)
							if (element.tagName === window.elementCatcher.tagName) window.elementCatcher.elements.push(element)
							return element
						}
						return true
					} else return false
				},
				args: [tagName]
			})
		},
		terminate: async function () {
			return await this.evaluate({
				world: 'MAIN',
				func: () => {
					if (window.elementCatcher) {
						document.createElement = window.elementCatcher.originalFunc
						delete window.elementCatcher.originalFunc
						delete window.elementCatcher.tagName
						return true
					} else return false
				}
			})
		},
		clear: async function () {
			return await this.evaluate({
				world: 'MAIN',
				func: () => {
					if (window.elementCatcher) {
						if (window.elementCatcher.originalFunc) document.createElement = window.elementCatcher.originalFunc
						delete window.elementCatcher
						return true
					} else return false
				}
			})
		}
	} as any
	manualClick = {
		enable: async function () {
			return await this.evaluate({
				func: () => {
					if (!window.manualClickPreventer) return false
					window.manualClickPreventer.remove()
					delete window.manualClickPreventer
					return true
				}
			})
		},
		disable: async function () {
			return await this.evaluate({
				func: () => {
					if (window.manualClickPreventer) return false
					window.manualClickPreventer = document.createElement('div')
					window.manualClickPreventer.style = 'width: 100%; height: 100%; position: fixed; top: 0; cursor: not-allowed; z-index: 12500; left: 0;'
					window.manualClickPreventer.addEventListener('contextmenu', (event: { preventDefault: () => any }) => event.preventDefault())
					document.body.appendChild(window.manualClickPreventer)
					return true
				}
			})
		}
	} as any
	windowId!: number
	tabId!: number
	tryLimit: number = 1000
	delay: number = 750
	onBeforeClose?: Function
	constructor(options: { tabId: number; windowId: number } | any) {
		Object.assign(this, options)
		this.elementCatcher.catch = this.elementCatcher.catch.bind(this)
		this.elementCatcher.terminate = this.elementCatcher.terminate.bind(this)
		this.elementCatcher.clear = this.elementCatcher.clear.bind(this)
		this.manualClick.enable = this.manualClick.enable.bind(this)
		this.manualClick.disable = this.manualClick.disable.bind(this)
	}
}