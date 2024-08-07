import Browser from './browser'
import RemoteElement from './element'
import { blobToDataUrl, chooseProperties, cropImageOffscreen, doDelay, imageBitmapFromUrl } from './library'
import { ActionOptions, PageConfigurations, defaultPageConfigurations } from './others'
import Self, { selfIntegration } from './self'

/**
 * Represents a Page instance for interacting with Chrome browser pages.
 */
export default class Page {
	/**
	 * @type {Browser} - The Browser instance associated with this Page instance.
	 **/
	browser!: Browser

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
	configurations: PageConfigurations = defaultPageConfigurations

	/**
	 * Function to be called when the Page instance encounters a glitch.
	 */
	async handleGlitch(glitch: any) {
		return `${glitch}\nPage URL: '${await chrome.tabs.get(this.tabId).then(({ url }) => url).catch(() => 'N/A')}'`
	}

	/**
	 * Configures the Page instance with the specified configurations.
	 * 
	 * @param {Object} configurations - An object represents configurations for the Page instance.
	 * @param {number} [configurations.tryLimit] - The maximum number of attempts for waiting operations.
	 * @param {number} [configurations.delay] - The delay between attempts in milliseconds.
	 * @param {boolean} [configurations.scrollToElementBeforeAction] - Scroll to the element before an action (`click`, `execPaste`, `triggerEvent`, `input`, `uploadFiles`). 
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
	constructor({ tabId, windowId, originWindowId, activeInOrigin, browser }: { tabId: number, windowId: number, originWindowId?: number, activeInOrigin?: number, browser: Browser }) {
		this.tabId = tabId
		this.windowId = windowId

		this.browser = browser

		if (originWindowId) this.originWindowId = originWindowId
		if (activeInOrigin) this.activeInOrigin = activeInOrigin

		this.elementCatcher.catch = this.elementCatcher.catch.bind(this)
		this.elementCatcher.terminate = this.elementCatcher.terminate.bind(this)

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
			if (url === 'about:blank') return

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
		} catch (glitch) { throw await this.handleGlitch(`Failed to navigate to URL '${url}'.\n${glitch}`) }
	}

	/**
	 * Reloads the current page.
	 * 
	 * @returns A promise that resolves when the page is reloaded.
	 */
	async reload(): Promise<void> {
		try {
			await this.goto(await this.url() as any)
		} catch (glitch) { throw await this.handleGlitch(`Failed to reload the page.\n${glitch}`) }
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
		} catch (glitch) { throw await this.handleGlitch(`Failed to get the URL of the page.\n${glitch}`) }
	}

	/**
	 * Close the current page.
	 * 
	 * @returns A promise that resolves when the page is closed.
	 */
	async close(): Promise<void> {
		try {
			await chrome.windows.remove(this.windowId).catch(() => { })
		} catch (glitch) { throw await this.handleGlitch(`Failed to close the page.\n${glitch}`) }
	}

	/**
	 * Zoom the current page.
	 * 
	 * @param {number} zoomFactor - The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor. Values greater than zero specify a (possibly non-default) zoom factor for the tab.
	 * @returns A promise that resolves when the zoom is applied.
	 */
	async zoom(zoomFactor: number) {
		try {
			if (zoomFactor !== await chrome.tabs.getZoom(this.tabId)) await chrome.tabs.setZoom(this.tabId, zoomFactor)
		} catch (glitch) { throw await this.handleGlitch(`Failed to zoom the page.\n${glitch}`) }
	}

	/**
	 * Brings the Chrome browser window associated with the page to the front.
	 * 
	 * @returns A promise that resolves when the window is brought to the front.
	 */
	async bringToFront(): Promise<void> {
		try {
			await chrome.windows.update(this.windowId, { focused: true })
		} catch (glitch) { throw await this.handleGlitch(`Failed to bring the page to the front.\n${glitch}`) }
	}

	/**
	 * Hides the Chrome browser window associated with the page.
	 * 
	 * @returns A promise that resolves when the window is hidden.
	 */
	async hideFromFront(): Promise<void> {
		try {
			await chrome.windows.update(this.windowId, { focused: false })
		} catch (glitch) { throw await this.handleGlitch(`Failed to hide the page from the front.\n${glitch}`) }
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
		let options: {
			func?: Function
			files?: string[]
			args?: any[]
			world?: 'ISOLATED' | 'MAIN'
			allFrames?: boolean
			frameIds?: number[]
			documentIds?: string[]
		} = {}
		try {
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
		} catch (glitch) { throw await this.handleGlitch(`Failed to evaluate ${options?.func ? `function '${options.func?.name}' with arguments '${JSON.stringify(options.args || [])}'` : `file(s) '${JSON.stringify(options.files || [])}'`} '' on the page.\n${glitch}`) }
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
		} catch (glitch) { throw await this.handleGlitch(`Glitch while waiting for function '${func?.name}' with arguments '${JSON.stringify(args || [])}'.\n${glitch}`) }
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
		} catch (glitch) { throw await this.handleGlitch(`Glitch while waiting for navigation.\n${glitch}`) }
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
						func: (selectors: string, index: any) => window.Self.getElementBySelectors(selectors, document, index) ? true : false,
						args: [selectors, index]
					}
				],
				options
			)
		} catch (glitch) { throw await this.handleGlitch(`Glitch while waiting for the CSS Selectors '${selectors}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
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
						func: (expression: string, index: any) => window.Self.getElementByXPath(expression, document, index) ? true : false,
						args: [expression, index]
					}
				],
				options
			)
		} catch (glitch) { throw await this.handleGlitch(`Glitch while waiting for the XPath '${expression}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
	}

	/**
	 * Waits for an element matching the given CSS Selectors or XPath expression to become available and returns the RemoteElement.
	 * 
	 * @param {string} selectors - The CSS Selectors or XPath expression of the element to wait for.
	 * @param {Object} [options] - Optional options for waiting.
	 * @param {number} [options.tryLimit] - The maximum number of attempts (default is 1000).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
	 * @param {number} [index = -1] - The index of the element if there are multiple matches.
	 * @returns {Promise<RemoteElement>}
	 */
	async waitForElement(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1) {
		if (await (Self.isXPath(selectors) ? this.waitForXPath : this.waitForSelector)(selectors, options, index).then(() => true).catch(() => false)) {
			return await this.getElement(selectors, index)
		}
	}

	/**
	 * Waits for an element matching the given XPath expression or CSS Selectors to disappear from the page.
	 * 
	 * @param {string} selectors - The CSS Selectors or XPath expression to check for element absence.
	 * @param {Object} [options] - Optional options for waiting.
	 * @param {number} [options.tryLimit] - The maximum number of attempts (default is 1000).
	 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
	 * @param {number} [index = -1] - The index of the element if there are multiple matches.
	 * @returns {Promise<boolean>}
	 */
	async waitForElementMiss(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<boolean> {
		return await this.waitFor(
			async (options: any) => this.evaluate(options),
			[
				{
					func: Self.isXPath(selectors) ? (
						(selectors: string, index: number) => window.Self.getElementByXPath(selectors, document, index) ? false : true
					) : (
						(selectors: string, index: number) => window.Self.getElementBySelectors(selectors, document, index) ? false : true
					),
					args: [selectors, index]
				}
			],
			options
		).then(() => true).catch(() => false)
	}

	/**
	 * Gets element as RemoteElement for the given XPath expression or CSS Selectors. It doesn't check if the existance of the element.
	 * @param {string} selectors - The CSS selector or XPath expression.
	 * @param {number} index - The index of the element to check.
	 * @returns {RemoteElement}
	 */
	element(selectors: string, index: number = -1) {
		const elementPath = `${selectors}⟮${index}⟯`
		return new RemoteElement(this, elementPath)
	}

	/**
	 * Gets element as RemoteElement matching the given XPath expression or CSS Selectors.
	 * 
	 * @param {string} selectors - The CSS selector or XPath expression.
	 * @param {number} index - The index of the element to check.
	 * @returns {Promise<RemoteElement>}
	 */
	async getElement(selectors: string, index: number = -1, context?: string) {
		const elementPath = `${context ? `${context}→${selectors}` : selectors}⟮${index}⟯`
		const { tagName } = await this.evaluate({
			func: (elementPath) => {
				const element = window.Self.ElementActions.getElement(elementPath)
				return element ? { tagName: element.tagName } : {}
			},
			args: [elementPath]
		})
		if (tagName) return new RemoteElement(this, elementPath, tagName)
	}

	/**
	 * Gets all the elements as RemoteElement[] matching the given XPath expression or CSS Selectors.
	 * 
	 * @param {string} selectors - The CSS selector or XPath expression.
	 * @returns {Promise<RemoteElement[]>}
	 */
	async getElements(selectors: string, context?: string) {
		const elements = await this.evaluate({
			func: (selectors, context) => {
				const contextElement = context ? window.Self.ElementActions.getElement(context) : document
				if (contextElement) {
					const elements = window.Self.getElements(selectors, contextElement)
					return elements.map(({ tagName }, index) => ({
						tagName,
						elementPath: context ? `${context}→${selectors}⟮${index}⟯` : `${selectors}⟮${index}⟯`
					}))
				}
			},
			args: [selectors, context]
		})
		return elements?.map(({ tagName, elementPath }) => new RemoteElement(this, elementPath, tagName))
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
				func: (selectors: string, index: number) => window.Self.getElement(selectors, document, index) ? true : false,
				args: [selectors, index]
			})
		} catch (glitch) { throw await this.handleGlitch(`Glitch while checking if element with the CSS Selectors or XPath '${selectors}'${index === -1 ? '' : `[${index}]`} exists.\n${glitch}`) }
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
				func: (selectors: string, index: any, options: ActionOptions) => window.Self.click(selectors, index, options),
				args: [selectors, index, this.configurations]
			})) throw new Error('No element(s) found for the given CSS Selectors or XPath.')
		} catch (glitch) { throw await this.handleGlitch(`Failed to click on element with the CSS Selectors or XPath '${selectors}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
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
				func: (selectors: string, index: number, options: ActionOptions) => window.Self.execPasteTo(selectors, index, options),
				args: [selectors, index, this.configurations]
			})) throw new Error('No element(s) found for the given CSS Selectors or XPath.')
		} catch (glitch) { throw await this.handleGlitch(`Failed to paste to element with the CSS Selectors or XPath '${selectors}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
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
				func: (selectors: string, type: any, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: ActionOptions) => {
					const element = window.Self.getElement(selectors, document, index)
					if (element) {
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						window.Self.triggerEvent(element, type)
						return true
					} else return false
				},
				args: [selectors, type, index, this.configurations]
			})) throw new Error('No element(s) found for the given CSS Selectors or XPath.')
		} catch (glitch) { throw await this.handleGlitch(`Failed to trigger event '${type}' on element with the CSS Selectors or XPath '${selectors}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
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
				func: (selectors: string, value: any, index: number, options: ActionOptions) => window.Self.input(selectors, value, index, options),
				args: [selectors, value, index, this.configurations]
			})) throw new Error('No element(s) found for the given CSS Selectors or XPath.')
		} catch (glitch) { throw await this.handleGlitch(`Failed to input value '${value}' into element with the CSS Selectors or XPath '${selectors}'${index === -1 ? '' : `[${index}]`}.\n${glitch}`) }
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
				async (filesIndex: number, selectors: string, caughtElementIndex: number = -1, { scrollToElementBeforeAction, scrollIntoViewOptions }: ActionOptions) => {
					// Upload file
					const element = selectors ? (selectors.match(/^(\/|\.\/|\()/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : document.querySelector(selectors)) : window.Self.elementCatcher.current?.elements[caughtElementIndex] as any
					if (element) {
						scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
						element.files = window.Self.filesToFileList((await Promise.all(window.transmittedFiles[filesIndex].map(async ({ blobUrl, dataUrl, name }: any) => (blobUrl ? window.Self.blobToFile((await window.Self.getBlob(blobUrl)) as any, name) : window.Self.dataUrlToFile(dataUrl, name))))) as any)
						window.Self.triggerEvent(element, 'input')
						window.Self.triggerEvent(element, 'change')
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
		} catch (glitch) { throw await this.handleGlitch(`Failed to upload files.\n${glitch}`) }
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
		} catch (glitch) { throw await this.handleGlitch(`Failed to take a screenshot.\n${glitch}`) }
	}

	elementCatcher = {
		/**
		 * Enables element catching for elements with the specified tag name. Some websites create dynamic elements and hide elements from the page to prevent automated tasks such as automated file upload, etc. It logs those elements to interact with them.
		 *
		 * @param {string[]} tagNames - The tag names of the elements to catch.
		 */
		catch: async function (tagNames: string[]): Promise<void> {
			try {
				if (!await (this as any).evaluate({
					world: 'MAIN',
					func: () => window.Self?.exists()
				})) await (this as any).evaluate({
					world: 'MAIN',
					func: selfIntegration
				})
				await (this as any).evaluate({
					world: 'MAIN',
					func: (tagNames: string[]) => window.Self.elementCatcher.catch(tagNames),
					args: [tagNames]
				})
			} catch (glitch) {
				throw glitch
			}
		},

		/**
		 * Terminates element catching and restores the original createElement function of JS.
		 */
		terminate: async function (): Promise<void> {
			try {
				await (this as any).evaluate({
					world: 'MAIN',
					func: () => window.Self?.elementCatcher.terminate()
				})
			} catch (glitch) {
				throw glitch
			}
		}
	} as {
		catch: (tagNames: string[]) => Promise<void>,
		terminate: () => Promise<void>
	}

	manualClick = {
		/**
		 * Enables manual clicks on the page.
		 */
		enable: async function (): Promise<void> {
			try {
				await (this as any).evaluate(() => window.Self.manualClick.enable())
			} catch (glitch) {
				throw glitch
			}
		},
		/**
		 * Disables manual clicks on the page.
		 */
		disable: async function (): Promise<void> {
			try {
				await (this as any).evaluate(() => window.Self.manualClick.disable())
			} catch (glitch) {
				throw glitch
			}
		}
	} as {
		enable: () => Promise<void>
		disable: () => Promise<void>
	}
}