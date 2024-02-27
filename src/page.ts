import { blobToDataUrl, chooseProperties, cropImageOffscreen, doDelay, imageBitmapFromUrl } from './library'

declare global {
	interface Window {
		elementCatcher: any
		manualClickPreventer: any
		transmittedFiles: any
	}
}

interface PageConfigurations {
	tryLimit: number
	delay: number
	scrollToElementBeforeAction: boolean
	scrollIntoViewOptions: ScrollIntoViewOptions
}

/**
 * Represents a Page instance for interacting with Chrome browser pages.
 */
export default class Page {
	/**
	 * @type {number} - The ID of the Chrome tab.
	 */
	tabId!: number

	/**
	 * @type {number} - The ID of the Chrome window.
	 */
	windowId!: number

	/**
	 * @type {number} - The ID of the tab's origin window. If supplied the tab will be moved in that window when closing the browser-automator instance instead of closing the tab.
	 */
	originWindowId!: number

	/**
	 * @type {number} - Whether the page/tab should be active in the origin window when moved to the origin window.
	 */
	activeInOrigin!: number

	/**
	 * @type {Function} - Callback function to be executed before closing the page.
	 */
	onBeforeClose?: Function

	/**
	 * @type {Object} - Represents the configurations for the Page instance.
	 */
	configurations: PageConfigurations = {
		tryLimit: 50,
		delay: 750,
		scrollToElementBeforeAction: true,
		scrollIntoViewOptions: {
			behavior: 'smooth',
			block: 'center'
		}
	}

	/**
	 * Configures the Page instance with the specified configurations.
	 * 
	 * @param {Object} configurations - An object represents configurations for the Page instance.
	 * @param {number} [configurations.tryLimit] - The maximum number of attempts for waiting operations.
	 * @param {number} [configurations.delay] - The delay between attempts in milliseconds.
	 * @param {boolean} [configurations.scrollToElementBeforeAction] - Scroll to the element before an action (`click`, `execPasteTo`, `triggerEvent`, `input`, `uploadFiles`). 
	 * @param {Object} [configurations.scrollIntoViewOptions] - Options for the `scrollIntoView` method to scroll to elements.
	 */
	configure(configurations: Partial<PageConfigurations>): void {
		this.configurations = {
			...this.configurations,
			...configurations
		}
	}

	/**
	 * Creates a new Page instance for a specific Chrome tab with the given tabId and windowId.
	 *
	 * @param {{ tabId: number; windowId: number }} options - An object containing tabId and windowId properties.
	 * @param {number} options.tabId - The unique identifier of the Chrome tab associated with this Page instance.
	 * @param {number} options.windowId - The unique identifier of the Chrome window containing the tab.
	 * @param {number} options.originWindowId - The ID of the tab's origin window. If supplied the tab will be moved in that window when closing the browser-automator instance instead of closing the tab.
	 * @param {number} options.activeInOrigin - Whether the page/tab should be active in the origin window when moved to the origin window.
	 */
	constructor({ tabId, windowId, originWindowId, activeInOrigin }: { tabId: number; windowId: number, originWindowId?: number, activeInOrigin?: number }) {
		this.tabId = tabId
		this.windowId = windowId
		if (originWindowId) this.originWindowId = originWindowId
		if (activeInOrigin) this.activeInOrigin = activeInOrigin

		this.elementCatcher.catch = this.elementCatcher.catch.bind(this)
		this.elementCatcher.terminate = this.elementCatcher.terminate.bind(this)
		this.elementCatcher.clear = this.elementCatcher.clear.bind(this)

		this.manualClick.enable = this.manualClick.enable.bind(this)
		this.manualClick.disable = this.manualClick.disable.bind(this)
	}

	/**
	 * Navigate to the specified URL.
	 * 
	 * @param {string} url - The URL to navigate to.
	 * @param {object} [options] - Navigation options.
	 * @param {string} [options.waitUntil='domcontentloaded'] - When to consider navigation as complete ('load' or 'domcontentloaded').
	 * @returns {Promise<void>} - Resolves when the navigation is complete.
	 */
	async goto(url: string, { waitUntil }: { waitUntil: 'load' | 'domcontentloaded' } = { waitUntil: 'domcontentloaded' }): Promise<void> {
		try {
			await chrome.tabs.update(this.tabId, { url: 'about:blank' })
			await chrome.tabs.update(this.tabId, { url: url })

			let tab
			if (waitUntil === 'load') {
				do {
					await doDelay(this.configurations.delay)
					tab = await chrome.tabs.get(this.tabId)
				} while (tab.pendingUrl === 'about:blank' || tab.url === 'about:blank')
			} else if ((waitUntil = 'domcontentloaded')) {
				do {
					await doDelay(this.configurations.delay)
					tab = await chrome.tabs.get(this.tabId)
				} while (tab.pendingUrl === 'about:blank' || tab.url === 'about:blank' || tab.status !== 'complete')
			}
		} catch (error) { throw error }
	}

	/**
	 * Reloads the current page.
	 * 
	 * @returns A promise that resolves when the page is reloaded.
	 */
	async reload(): Promise<void> {
		try {
			await this.goto(await this.url() as any)
		} catch (error) { throw error }
	}

	/**
	 * Get the current URL of the page.
	 * 
	 * @returns A promise that resolves to the current URL as a string.
	 */
	async url(): Promise<string> {
		try {
			const { url } = await chrome.tabs.get(this.tabId)
			return url as string
		} catch (error) { throw error }
	}

	/**
	 * Close the current page.
	 * 
	 * @returns A promise that resolves when the page is closed.
	 */
	async close(): Promise<void> {
		try {
			await chrome.windows.remove(this.windowId).catch(() => { })
		} catch (error) { throw error }
	}

	/**
	 * Brings the Chrome browser window associated with the page to the front.
	 * 
	 * @returns A promise that resolves when the window is brought to the front.
	 */
	async bringToFront(): Promise<void> {
		try {
			await chrome.windows.update(this.windowId, { focused: true })
		} catch (error) { throw error }
	}

	/**
	 * Hides the Chrome browser window associated with the page.
	 * 
	 * @returns A promise that resolves when the window is hidden.
	 */
	async hideFromFront(): Promise<void> {
		try {
			await chrome.windows.update(this.windowId, { focused: false })
		} catch (error) { throw error }
	}

	/**
	 * Evaluates a function on the page.
	 * 
	 * @param {Function} func - The function to evaluate.
	 * @param {any[]} [args] - Arguments to pass to the function.
	 * @param {Object} [options] - Optional evaluation options.
	 * @param {'ISOLATED' | 'MAIN'} [options.world] - The world context for evaluation (default is 'MAIN').
	 * @param {boolean} [options.allFrames] - Indicates whether to evaluate in all frames (default is false).
	 * @param {number[]} [options.frameIds] - An array of frame identifiers where the evaluation should take place.
	 * @param {string[]} [options.documentIds] - An array of document identifiers for the frames to evaluate in.
	 * @returns {Promise<any>} - The result of the evaluation.
	 */
	async evaluate<T extends (...args: any[]) => any>(
		func: T,
		args: Parameters<T>,
		options?: {
			world?: 'ISOLATED' | 'MAIN'
			allFrames?: boolean
			frameIds?: number[]
			documentIds?: string[]
		}
	): Promise<ReturnType<T>>

	/**
	 * Evaluates a function on the page.
	 * 
	 * @param {Function} func - The function to evaluate.
	 * @param {Object} [options] - Optional evaluation options.
	 * @param {'ISOLATED' | 'MAIN'} [options.world] - The world context for evaluation (default is 'MAIN').
	 * @param {boolean} [options.allFrames] - Indicates whether to evaluate in all frames (default is false).
	 * @param {number[]} [options.frameIds] - An array of frame identifiers where the evaluation should take place.
	 * @param {string[]} [options.documentIds] - An array of document identifiers for the frames to evaluate in.
	 * @returns {Promise<any>} - The result of the evaluation.
	 */
	async evaluate<T extends () => any>(
		func: T,
		options?: {
			world?: 'ISOLATED' | 'MAIN'
			allFrames?: boolean
			frameIds?: number[]
			documentIds?: string[]
		}
	): Promise<ReturnType<T>>

	/**
	 * Evaluates JavaScript function on the page.
	 * 
	 * @param {Object} options - An object specifying evaluation options.
	 * @param {Function} [options.func] - The function to evaluate.
	 * @param {any[]} [options.args] - Arguments to pass to the evaluated function.
	 * @param {'ISOLATED' | 'MAIN'} [options.world] - The world context for evaluation (default is 'MAIN').
	 * @param {boolean} [options.allFrames] - Indicates whether to evaluate in all frames (default is false).
	 * @param {number[]} [options.frameIds] - An array of frame identifiers where the evaluation should take place.
	 * @param {string[]} [options.documentIds] - An array of document identifiers for the frames to evaluate in.
	 * @returns {Promise<any>} - The result of the evaluation.
	 */
	async evaluate<T extends (...args: any[]) => any>(
		options: {
			func: T
			args?: Parameters<T>
			world?: 'ISOLATED' | 'MAIN'
			allFrames?: boolean
			frameIds?: number[]
			documentIds?: string[]
		},
	): Promise<ReturnType<T>>

	/**
	 * Evaluates JS files on the page.
	 * 
	 * @param {string[]} files - An array of script file paths to evaluate. 
	 * @param {Object} [options] - Optional evaluation options.
	 * @param {'ISOLATED' | 'MAIN'} [options.world] - The world context for evaluation (default is 'MAIN').
	 * @param {boolean} [options.allFrames] - Indicates whether to evaluate in all frames (default is false).
	 * @param {number[]} [options.frameIds] - An array of frame identifiers where the evaluation should take place.
	 * @param {string[]} [options.documentIds] - An array of document identifiers for the frames to evaluate in.
	 * @returns {Promise<any>} - The result of the evaluation.
	 */
	async evaluate(
		files: string[],
		options?: {
			world?: 'ISOLATED' | 'MAIN'
			allFrames?: boolean
			frameIds?: number[]
			documentIds?: string[]
		}
	): Promise<any>

	async evaluate() {
		try {
			let options: {
				func?: Function
				files?: string[]
				args?: any[]
				world?: 'ISOLATED' | 'MAIN'
				allFrames?: boolean
				frameIds?: number[]
				documentIds?: string[]
			}
			if (typeof arguments[0] === 'function') {
				const [func, args, others] = arguments
				options = { func, args, ...(others || {}) }
			} else if (Array.isArray(arguments[0])) {
				const [files, args, others] = arguments
				options = { files, args, ...(others || {}) }
			} else {
				options = arguments[0]
			}
			const execution = await chrome.scripting.executeScript({
				target: {
					tabId: this.tabId,
					...chooseProperties(options, ['allFrames', 'frameIds', 'documentIds'])
				},
				world: 'ISOLATED',
				...chooseProperties(options, ['func', 'files', 'args', 'world'])
			} as any)
			return execution?.[0]?.result
		} catch (error) { throw error }
	}

	/**
	 * Waits for a function to return a truthy value.
	 * 
	 * @param {Function} func - The function representing the condition to wait for.
	 * @param {any[]} args - Arguments to pass to the function.
	 * @param {Object} [options] - Optional wait options.
	 * @param {number} [options.tryLimit] - The maximum number of attempts to wait for the condition (default is this.tryLimit).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is this.delay).
	 * @returns {Promise<any>} - The result of the evaluated condition.
	*/
	async waitFor(func: Function, args: any[], options: { tryLimit?: number; delay?: number } = {}): Promise<any> {
		try {
			let value,
				tryLimit = options.tryLimit || this.configurations.tryLimit,
				delay = options.delay || this.configurations.delay
			while (!(value = await func(...args)) && tryLimit) {
				tryLimit--
				await doDelay(delay)
			}
			if (value) return value
			else throw new Error('Waiting timed out...')
		} catch (error) { throw error }
	}

	/**
	 * Waits for the page to navigate to a new URL.
	 * 
	 * @param {Object} [options] - An object specifying waiting options.
	 * @param {number} [options.tryLimit] - The maximum number of attempts to wait for navigation (default is 50).
	 * @param {number} [options.delay] - The delay between each attempt in milliseconds (default is 750).
	 * @returns {Promise<void>}
	 */
	async waitForNavigation(options: { tryLimit?: number; delay?: number } = {}): Promise<void> {
		try {
			const lastUrl = await this.url()
			await this.waitFor(
				async (lastUrl: string) => ((await this.url()) === lastUrl ? false : true),
				[lastUrl],
				options
			)
		} catch (error) { throw error }
	}

	/**
	 * Waits for an element matching the given CSS selector to become available.
	 *
	 * @param {string} selectors - The CSS selector to wait for.
	 * @param {Object} [options] - Optional wait options.
	 * @param {number} [options.tryLimit] - The maximum number of attempts to find the element (default is 1000).
	 * @param {number} [options.delay] - The delay between attempts in milliseconds (default is 750).
	 * @param {number} [index = -1] - The index of the element if multiple elements match the selector.
	 * @returns {Promise<void>}
	 */
	async waitForSelector(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
		try {
			await this.waitFor(
				async (options: any) => this.evaluate(options),
				[
					{
						func: (selectors: string, index: any) => (
							(index === -1 ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]) ? true : false
						),
						args: [selectors, index]
					}
				],
				options
			)
		} catch (error) { throw error }
	}

	/**
	 * Waits for an element matching the given CSS selector to disappear from the page.
	 * 
	 * @param {string} selectors - The CSS selector to check for element absence.
	 * @param {Object} [options] - Optional options for waiting.
	 * @param {number} [options.tryLimit] - The maximum number of attempts (default is 1000).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
	 * @param {number} [index = -1] - The index of the element if there are multiple matches.
	 * @returns {Promise<void>}
	 */
	async waitForSelectorMiss(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
		try {
			await this.waitFor(
				async (options: any) => this.evaluate(options),
				[
					{
						func: (selectors: string, index: any) => (
							(index === -1 ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]) ? false : true
						),
						args: [selectors, index]
					}
				],
				options
			)
		} catch (error) { throw error }
	}

	/**
	 * Waits for an element matching the given XPath expression to appear in the page.
	 * 
	 * @param {any} expression - The XPath expression to wait for.
	 * @param {{ tryLimit?: number; delay?: number }} [options] - Optional waiting options.
	 * @param {number} [options.tryLimit] - The maximum number of attempts to find the element (default is 1000).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
	 * @param {number} [index] - The index of the element to interact with.
	 * @returns {Promise<void>}
	 */
	async waitForXPath(expression: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
		try {
			await this.waitFor(
				async (options: any) => this.evaluate(options),
				[
					{
						func: (expression: string, index: any) => (
							index === -1 ? (
								document.evaluate(expression, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ? true : false
							) : (
								document.evaluate(expression, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index) ? true : false
							)
						),
						args: [expression, index]
					}
				],
				options
			)
		} catch (error) { throw error }
	}

	/**
	 * Waits for an element matching the given XPath expression to disappear from the page.
	 * 
	 * @param {string} selectors - The CSS XPath expression to check for element absence.
	 * @param {Object} [options] - Optional options for waiting.
	 * @param {number} [options.tryLimit] - The maximum number of attempts (default is 1000).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
	 * @param {number} [index = -1] - The index of the element if there are multiple matches.
	 * @returns {Promise<void>}
	 */
	async waitForXPathMiss(expression: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
		try {
			await this.waitFor(
				async (options: any) => this.evaluate(options),
				[
					{
						func: (expression: string, index: number) => (
							index === -1 ? (
								document.evaluate(expression, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ? false : true
							) : (
								document.evaluate(expression, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index) ? false : true
							)
						),
						args: [expression, index]
					}
				],
				options
			)
		} catch (error) { throw error }
	}

	/**
	 * Checks if an element specified by the CSS selector or XPath expression exists on the page.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression to check for existence.
	 * @param {number} index - The index of the element to check.
	 * @returns {Promise<boolean>}
	 */
	async elementExists(selectors: string, index: number = -1): Promise<boolean> {
		try {
			return await this.evaluate({
				func: (selectors: string, index: number) => {
					const element = index === -1 ? (
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
		} catch (error) { throw error }
	}

	/**
	 * Clicks on the element specified by the CSS selector or XPath expression.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression to click on.
	 * @param {number} index - The index of the element to interact with.
	 * @returns {Promise<void>}
	 */
	async click(selectors: string, index: number = -1): Promise<void> {
		try {
			if (!await this.evaluate({
				func: (selectors: string, index: any, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
					const element = index === -1 ? (
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
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						element.click()
						return true
					} else return false
				},
				args: [selectors, index, this.configurations]
			})) throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
		} catch (error) { throw error }
	}

	/**
	 * Copies text to the clipboard.
	 *
	 * @param {string} text - The text to copy to the clipboard.
	 */
	execCopy(text: string): void {
		const textarea = document.createElement('textarea')
		textarea.innerHTML = text
		document.body.appendChild(textarea)
		textarea.select()
		document.execCommand('copy')
		textarea.remove()
	}

	/**
	 * Pastes text from the clipboard to an element specified by the CSS selector or XPath expression.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression of the target element.
	 * @param {number} index - The index of the element to interact with (default is -1).
	 * @returns {Promise<void>}
	 */
	async execPasteTo(selectors: string, index: number = -1): Promise<void> {
		try {
			if (!await this.evaluate({
				func: (selectors: string, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
					const element = index === -1 ? (
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
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						element.focus()
						if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.select()
						document.execCommand('paste')
						return true
					} else return false
				},
				args: [selectors, index, this.configurations]
			})) throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
		} catch (error) { throw error }
	}

	/**
	 * Triggers an event on the element specified by the CSS selector or XPath expression.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression of the target element.
	 * @param {string} type - The type of event to trigger.
	 * @param {number} index - The index of the element to interact with.
	 * @returns {Promise<void>}
	 */
	async triggerEvent(selectors: string, type: 'click' | 'input' | 'submit' | 'keydown' | 'keyup' | 'keypress' | 'change' | 'mouseover' | 'mouseout' | 'focus' | 'blur' | 'load' | string, index: number = -1): Promise<void> {
		try {
			if (!await this.evaluate({
				func: (selectors: string, type: any, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
					function triggerEvent(element: any, type: string) {
						element.dispatchEvent(
							new Event(type, {
								bubbles: true,
								cancelable: true
							})
						)
					}
					const element = index === -1 ? (
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
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						triggerEvent(element, type)
						return true
					} else return false
				},
				args: [selectors, type, index, this.configurations]
			})) throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
		} catch (error) { throw error }
	}

	/**
	 * Inputs a value into the element specified by the CSS selector or XPath expression.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression of the target element.
	 * @param {any} value - The value to input.
	 * @param {number} index - The index of the element to interact with.
	 * @returns {Promise<void>}
	 */
	async input(selectors: string, value: any, index: number = -1): Promise<void> {
		try {
			if (!await this.evaluate({
				func: (selectors: string, value: any, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
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
					const element = index === -1 ? (
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
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						setValue(element, value)
						return true
					} else return false
				},
				args: [selectors, value, index, this.configurations]
			})) throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
		} catch (error) { throw error }
	}

	/**
	 * Uploads files to an input element specified by the CSS selector or XPath expression.
	 *
	 * @param {string} selectors - The CSS selector or XPath expression of the input element.
	 * @param {(File | { name: string, blob: Blob, dataUrl?: string, blobUrl?: string })[]} files - An array of files to upload, where each file can be a File object or an object with name, blob, dataUrl, and blobUrl properties.
	 * @param {number} caughtElementIndex - The index of the element to interact with (default is -1).
	 * @returns {Promise<void>}
	 */
	async uploadFiles(selectors: string, files: (File | { name: string, blob: Blob, dataUrl?: string, blobUrl?: string } | any)[], caughtElementIndex: number): Promise<void> {
		try {
			const executionWorld = caughtElementIndex ? 'MAIN' : 'ISOLATED'

			// Send basic informations of the files
			const filesIndex = await this.evaluate({
				world: executionWorld,
				func: (files: any) => {
					if (!window.transmittedFiles) window.transmittedFiles = []
					return window.transmittedFiles.push(files) - 1
				},
				args: [
					files.map(({ name }: any, index: number) => Object.assign(
						{ name },
						files[index].blob && (files[index].blobUrl = URL.createObjectURL(files[index].blob)) ? {
							blobUrl: files[index].blobUrl
						} : {
							dataUrl: ''
						}
					))
				]
			})

			// Transmit the data URLs in multiple chunks if there is any
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

			// Upload the file
			await this.evaluate(
				async (filesIndex: number, selectors: string, caughtElementIndex: number = -1, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
					function filesToFileList(files: FileList) {
						const dataTransferer = new DataTransfer()
						for (const file of files) dataTransferer.items.add(file)
						return dataTransferer.files
					}
					function dataUrlToFile(dataUrl: string, name: string) {
						let [mime, data] = dataUrl.split(',')
						mime = (<any>mime).match(/:(.*?);/)[1]
						data = atob(data)
						let index = data.length,
							dataArray = new Uint8Array(index)
						while (index--) dataArray[index] = data.charCodeAt(index)
						return new File([dataArray], name, { type: mime })
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
					function blobToFile(blob: Blob, name: string) {
						return new File([blob], name, { type: blob.type })
					}
					// Upload file
					const element = selectors ? (selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : document.querySelector(selectors)) : window.elementCatcher.elements[caughtElementIndex]
					if (element) {
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						element.files = filesToFileList((await Promise.all(window.transmittedFiles[filesIndex].map(async ({ blobUrl, dataUrl, name }: any) => (blobUrl ? blobToFile((await getBlob(blobUrl)) as any, name) : dataUrlToFile(dataUrl, name))))) as any)
						triggerEvent(element, 'input')
						triggerEvent(element, 'change')
						// Clear transmitted data
						delete window.transmittedFiles[filesIndex]
						if (window.transmittedFiles.filter(Boolean).length === 0) delete window.transmittedFiles
						return true
					} else return false
				},
				[filesIndex, selectors, caughtElementIndex, this.configurations],
				{ world: executionWorld }
			)

			// Revoke all blob urls to remove references
			files.forEach(({ blobUrl }: any) => URL.revokeObjectURL(blobUrl))
		} catch (error) { throw error }
	}

	/**
	 * Takes a screenshot of the visible area of the page.
	 *
	 * @param {{ clip?: { x: number; y: number; width: number; height: number }}} options - Optional clipping parameters.
	 * @returns {Promise<string>} - The data URL of the screenshot.
	 */
	async screenshot({ clip }: { clip?: { x: number; y: number; width: number; height: number } }): Promise<string> {
		try {
			let dataUrl = await chrome.tabs.captureVisibleTab(this.windowId, { format: 'png' })
			if (clip) {
				const { width, height, x, y } = clip
				const croppedImage = await cropImageOffscreen(await imageBitmapFromUrl(dataUrl), width, height, x, y)
				dataUrl = (await blobToDataUrl(await (croppedImage as any).convertToBlob())) as string
			}
			return dataUrl
		} catch (error) { throw error }
	}

	elementCatcher = {
		/**
		 * Enables element catching for elements with the specified tag name. Some websites create dynamic elements and hide elements from the page to prevent automated tasks such as automated file upload, etc. It logs those elements to interact with them.
		 *
		 * @param {any} tagName - The tag name of the elements to catch.
		 */
		catch: async function (tagName: any): Promise<void> {
			try {
				await this.evaluate({
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
						}
					},
					args: [tagName]
				})
			} catch (error) { throw error }
		},

		/**
		 * Terminates element catching and restores the original createElement function of JS.
		 */
		terminate: async function (): Promise<void> {
			try {
				await this.evaluate({
					world: 'MAIN',
					func: () => {
						if (window.elementCatcher) {
							document.createElement = window.elementCatcher.originalFunc
							delete window.elementCatcher.originalFunc
							delete window.elementCatcher.tagName
						}
					}
				})
			} catch (error) { throw error }
		},

		/**
		 * Clears the element catcher, restoring the original createElement function.
		 */
		clear: async function (): Promise<void> {
			try {
				await this.evaluate({
					world: 'MAIN',
					func: () => {
						if (window.elementCatcher) {
							if (window.elementCatcher.originalFunc) document.createElement = window.elementCatcher.originalFunc
							delete window.elementCatcher
						}
					}
				})
			} catch (error) { throw error }
		}
	} as any

	manualClick = {
		/**
		 * Enables manual clicks on the page.
		 */
		enable: async function (): Promise<void> {
			try {
				await this.evaluate({
					func: () => {
						if (window.manualClickPreventer) {
							window.manualClickPreventer.remove()
							delete window.manualClickPreventer
						}
					}
				})
			} catch (error) { throw error }
		},
		/**
		 * Disables manual clicks on the page.
		 */
		disable: async function (): Promise<void> {
			try {
				await this.evaluate({
					func: () => {
						if (!window.manualClickPreventer) {
							window.manualClickPreventer = document.createElement('div')
							window.manualClickPreventer.style = 'width: 100%; height: 100%; position: fixed; top: 0; cursor: not-allowed; z-index: 12500; left: 0;'
							window.manualClickPreventer.addEventListener('contextmenu', (event: { preventDefault: () => any }) => event.preventDefault())
							document.body.appendChild(window.manualClickPreventer)
						}
					}
				})
			} catch (error) { throw error }
		}
	} as any
}