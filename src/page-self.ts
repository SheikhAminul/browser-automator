declare global {
	interface Window {
		elementCatcher: any
		manualClickPreventer: any
	}
}

interface PageConfigurations {
	tryLimit: number
	delay: number
	scrollToElementBeforeAction: boolean
	scrollIntoViewOptions: ScrollIntoViewOptions
}

const selfAutomator = (global = true) => {
	async function doDelay(milliseconds: number) {
		return new Promise(onDone => setTimeout(onDone, milliseconds))
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

	class Page {
		/**
		 * @type {Object} - Represents the configurations for the Page instance.
		 */
		static configurations: PageConfigurations = {
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
		static configure(configurations: Partial<PageConfigurations>): void {
			this.configurations = {
				...this.configurations,
				...configurations
			}
		}

		/**
		 * Navigate to the specified URL.
		 * 
		 * @param {string} url - The URL to navigate to.
		 */
		static goto(url: string): void {
			try {
				location.href = url
			} catch (error) { throw error }
		}

		/**
		 * Reloads the current page.
		 */
		static reload(): void {
			try {
				location.reload()
			} catch (error) { throw error }
		}

		/**
		 * Get the current URL of the page.
		 * 
		 * @returns The current URL as a string.
		 */
		static url(): string {
			try {
				return location.href
			} catch (error) { throw error }
		}

		/**
		 * Close the current page.
		 */
		static close(): void {
			try {
				close()
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
		static async waitFor(func: Function, args: any[], options: { tryLimit?: number; delay?: number } = {}): Promise<any> {
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
		static async waitForNavigation(options: { tryLimit?: number; delay?: number } = {}): Promise<void> {
			try {
				const lastUrl = this.url()
				await this.waitFor(
					async (lastUrl: string) => ((this.url()) === lastUrl ? false : true),
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
		static async waitForSelector(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
			try {
				await this.waitFor(
					(selectors: string, index: any) => (
						(index === -1 ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]) ? true : false
					),
					[selectors, index],
					options
				)
			} catch (error) { throw error }
		}

		/**
		 * Waits for an element matching the given selector to disappear from the page.
		 * 
		 * @param {string} selectors - The CSS selector or XPath expression to check for element absence.
		 * @param {Object} [options] - Optional options for waiting.
		 * @param {number} [options.tryLimit] - The maximum number of attempts (default is 1000).
		 * @param {number} [options.delay] - The delay in milliseconds between attempts (default is 750ms).
		 * @param {number} [index = -1] - The index of the element if there are multiple matches.
		 * @returns {Promise<void>}
		 */
		static async waitForSelectorMiss(selectors: string, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
			try {
				await this.waitFor(
					(selectors: string, index: any) => (
						(index === -1 ? document.querySelector(selectors) : document.querySelectorAll(selectors)[index]) ? false : true
					),
					[selectors, index],
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
		static async waitForXPath(expression: any, options: { tryLimit?: number; delay?: number } = {}, index: number = -1): Promise<void> {
			try {
				await this.waitFor(
					(expression: string, index: any) => (
						index === -1 ? (
							document.evaluate(expression, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ? true : false
						) : (
							document.evaluate(expression, document.documentElement, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index) ? true : false
						)
					),
					[expression, index],
					options
				)
			} catch (error) { throw error }
		}

		/**
		 * Checks if an element specified by the CSS selector or XPath expression exists on the page.
		 *
		 * @param {string} selectors - The CSS selector or XPath expression to check for existence.
		 * @param {number} index - The index of the element to check.
		 * @returns {boolean}
		 */
		static elementExists(selectors: string, index: number = -1): boolean {
			try {
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
			} catch (error) { throw error }
		}

		/**
		 * Clicks on the element specified by the CSS selector or XPath expression.
		 *
		 * @param {string} selectors - The CSS selector or XPath expression to click on.
		 * @param {number} index - The index of the element to interact with.
		 * @returns {void}
		 */
		static click(selectors: string, index?: number): void

		/**
		 * Clicks on the element specified by the CSS selector or XPath expression.
		 *
		 * @param {Element} element - Represents a DOM element in the document.
		 * @returns {void}
		 */
		static click(element: Element): void

		static click(): void {
			try {
				let selectors: string = '', element: any, index: number = -1
				if (typeof arguments[0] === 'string') {
					[selectors, index] = arguments
					if (!index) index = -1
				} else {
					[element] = arguments
				}

				const { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'> = this.configurations

				if (!element) {
					element = index === -1 ? (
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
				}

				if (element) {
					scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
					element.click()
				} else throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
			} catch (error) { throw error }
		}

		/**
		 * Copies text to the clipboard.
		 *
		 * @param {string} text - The text to copy to the clipboard.
		 */
		static execCopy(text: string): void {
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
		 * @returns {void}
		 */
		static execPasteTo(selectors: string, index?: number): void

		/**
		 * Pastes text from the clipboard to an element specified by the CSS selector or XPath expression.
		 *
		 * @param {Element} element - Represents a DOM element in the document.
		 * @returns {void}
		 */
		static execPasteTo(element: Element): void

		static execPasteTo(): void {
			try {
				let selectors: string = '', element: any, index: number = -1
				if (typeof arguments[0] === 'string') {
					[selectors, index] = arguments
					if (!index) index = -1
				} else {
					[element] = arguments
				}

				const { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'> = this.configurations
				if (!element) {
					element = index === -1 ? (
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
				}

				if (element) {
					scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
					element.focus()
					if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.select()
					document.execCommand('paste')
				} else throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
			} catch (error) { throw error }
		}

		/**
		 * Triggers an event on the element specified by the CSS selector or XPath expression.
		 *
		 * @param {string} selectors - The CSS selector or XPath expression of the target element.
		 * @param {string} type - The type of event to trigger.
		 * @param {number} index - The index of the element to interact with.
		 * @returns {void}
		 */
		static triggerEvent(selectors: string, type: 'click' | 'input' | 'submit' | 'keydown' | 'keyup' | 'keypress' | 'change' | 'mouseover' | 'mouseout' | 'focus' | 'blur' | 'load' | string, index?: number): void

		/**
		 * Triggers an event on the element specified by the CSS selector or XPath expression.
		 *
		 * @param {Element} element - Represents a DOM element in the document.
		 * @param {string} type - The type of event to trigger.
		 * @returns {void}
		 */
		static triggerEvent(element: Element, type: 'click' | 'input' | 'submit' | 'keydown' | 'keyup' | 'keypress' | 'change' | 'mouseover' | 'mouseout' | 'focus' | 'blur' | 'load' | string): void

		static triggerEvent(): void {
			try {
				let selectors: string = '', element: any, type: string, index: number = -1
				if (typeof arguments[0] === 'string') {
					[selectors, type, index] = arguments
					if (!index) index = -1
				} else {
					[element, type] = arguments
				}

				const { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'> = this.configurations

				if (!element) {
					element = index === -1 ? (
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
				}

				if (element) {
					scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
					triggerEvent(element, type)
				} else throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
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
		static input(selectors: string, value: any, index?: number): void

		/**
		 * Inputs a value into the element specified by the CSS selector or XPath expression.
		 *
		 * @param {Element} element - Represents a DOM element in the document.
		 * @param {any} value - The value to input.
		 * @returns {void}
		 */
		static input(element: Element, value: any): void

		static input(): void {
			try {
				let selectors: string = '', element: any, value: any, index: number = -1
				if (typeof arguments[0] === 'string') {
					[selectors, value, index] = arguments
					if (!index) index = -1
				} else {
					[element, value] = arguments
				}

				const { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'> = this.configurations

				if (!element) {
					element = index === -1 ? (
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
				}

				if (element) {
					scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
					setValue(element, value)
				} else throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
			} catch (error) { throw error }
		}

		/**
		 * Uploads files to an input element specified by the CSS selector or XPath expression.
		 *
		 * @param {string} selectors - The CSS selector or XPath expression of the input element.
		 * @param {(File)[]} files - An array of files to upload, where each file can be a File object.
		 * @param {number} index - The index of the element to interact with.
		 * @returns {void}
		 */
		static uploadFiles(selectors: string, files: File[], index?: number): void

		/**
		 * Uploads files to an input element specified by the CSS selector or XPath expression.
		 *
		 * @param {Element} element - Represents a DOM element in the document.
		 * @param {(File)[]} files - An array of files to upload, where each file can be a File object.
		 * @returns {void}
		 */
		static uploadFiles(element: Element, files: File[]): void

		static uploadFiles(): void {
			try {
				let selectors: string = '', element: any, files: File[], index: number = -1
				if (typeof arguments[0] === 'string') {
					[selectors, files, index] = arguments
					if (!index) index = -1
				} else {
					[element, files] = arguments
				}

				const { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'> = this.configurations

				if (!element) {
					element = index === -1 ? (
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
				}

				if (element) {
					scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
					element.scrollIntoView({ block: 'center', behavior: 'smooth' })
					element.files = files
					triggerEvent(element, 'input')
					triggerEvent(element, 'change')
				} else throw new Error(`No element(s) found for the CSS Selectors or XPath (${selectors}${index === -1 ? '' : `, ${index}`}).`)
			} catch (error) { throw error }
		}

		/**
		 * Get a single DOM element using an XPath expression within a given context node.
		 *
		 * @param {string} expression - The XPath expression to select the desired element.
		 * @param {Node} [contextNode=document.documentElement] - The optional context node within which to search for the element.
		 * @returns {Node | null} The first matching DOM element found, or null if none is found.
		 */
		static getElementByXPath(expression: string, contextNode: Node = document.documentElement): Node {
			return document.evaluate(expression, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue as any
		}

		/**
		 * Get an array of DOM elements matching an XPath expression within a given context node.
		 *
		 * @param {string} expression - The XPath expression to select the desired elements.
		 * @param {Node} [contextNode=document.documentElement] - The optional context node within which to search for the elements.
		 * @returns {Node[]} An array of DOM elements that match the XPath expression.
		 */
		static getElementsByXPath = (expression: string, contextNode: Node = document.documentElement): Node[] => {
			let elements = []
			let xpathQuery = document.evaluate(expression, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
			for (let index = 0; index < xpathQuery.snapshotLength; index++) elements.push(xpathQuery.snapshotItem(index))
			return elements as any
		}

		static elementCatcher = {
			/**
			 * Enables element catching for elements with the specified tag name. Some websites create dynamic elements and hide elements from the page to prevent automated tasks such as automated file upload, etc. It logs those elements to interact with them.
			 *
			 * @param {any} tagName - The tag name of the elements to catch.
			 */
			catch: function (tagName: any): void {
				try {
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
				} catch (error) { throw error }
			},

			/**
			 * Terminates element catching and restores the original createElement function of JS.
			 */
			terminate: function (): void {
				try {
					if (window.elementCatcher) {
						document.createElement = window.elementCatcher.originalFunc
						delete window.elementCatcher.originalFunc
						delete window.elementCatcher.tagName
					}
				} catch (error) { throw error }
			},

			/**
			 * Clears the element catcher, restoring the original createElement function.
			 */
			clear: function (): void {
				try {
					if (window.elementCatcher) {
						if (window.elementCatcher.originalFunc) document.createElement = window.elementCatcher.originalFunc
						delete window.elementCatcher
					}
				} catch (error) { throw error }
			}
		} as any

		static manualClick = {
			/**
			 * Enables manual clicks on the page.
			 */
			enable: function (): void {
				try {
					if (!window.manualClickPreventer) {
						window.manualClickPreventer = document.createElement('div')
						window.manualClickPreventer.style = 'width: 100%; height: 100%; position: fixed; top: 0; cursor: not-allowed; z-index: 12500; left: 0;'
						window.manualClickPreventer.addEventListener('contextmenu', (event: { preventDefault: () => any }) => event.preventDefault())
						document.body.appendChild(window.manualClickPreventer)
					}
				} catch (error) { throw error }
			},
			/**
			 * Disables manual clicks on the page.
			 */
			disable: function (): void {
				try {
					if (window.manualClickPreventer) {
						window.manualClickPreventer.remove()
						delete window.manualClickPreventer
					}
				} catch (error) { throw error }
			}
		} as any
	}
	if (global) (window as any).Self = Page
	else return Page
}

const Self = selfAutomator(false)
export default Self
export { selfAutomator }