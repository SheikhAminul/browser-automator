import { doDelay, setValue, triggerEvent } from './library'

declare global {
	interface Window {
		elementCatcher: any
		manualClickPreventer: any
	}
}

export default class Page {
	static goto(url: string) {
		location.href = url
		return true
	}
	static reload() {
		location.reload()
		return true
	}
	static url() {
		return location.href
	}
	static close() {
		close()
		return true
	}
	static evaluate({ func }: { func: Function }) {
		return func()
	}
	static async waitFor(func: Function, args: any, options = {} as { tryLimit?: number; delay?: number }) {
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
	static async waitForSelector(selectors: string, options = {}) {
		return await this.waitFor((selectors: string) => (document.querySelector(selectors) ? true : false), [selectors], options)
	}
	static async waitForXPath(expression: any, options = {}) {
		return await this.waitFor((expression: string) => (document.evaluate(expression, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue ? true : false), [expression], options)
	}
	static click(selectors: string) {
		const element = selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : (document.querySelector(selectors) as any)
		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' })
			element.click()
			return true
		} else return false
	}
	static execCopy(text: string) {
		const textarea = document.createElement('textarea')
		textarea.innerHTML = text
		document.body.appendChild(textarea)
		textarea.select()
		document.execCommand('copy')
		textarea.remove()
	}
	static execPasteTo(selectors: string) {
		const element = selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : (document.querySelector(selectors) as any)
		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' })
			element.focus()
			if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.select()
			document.execCommand('paste')
			return true
		} else return false
	}
	static triggerEvent(selectors: string, type: any) {
		const element = selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : (document.querySelector(selectors) as any)
		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' })
			triggerEvent(element, type)
			return true
		} else return false
	}
	static input(selectors: string, value: any) {
		const element = selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : (document.querySelector(selectors) as any)
		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' })
			setValue(element, value)
			return true
		} else return false
	}
	static uploadFiles(files: FileList, selectors: string, caughtElementIndex: number) {
		const element = selectors ? (selectors.match(/^(\/|\.\/)/) ? document.evaluate(selectors, document.documentElement, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue : document.querySelector(selectors)) : window.elementCatcher.elements[caughtElementIndex]
		if (element) {
			element.scrollIntoView({ block: 'center', behavior: 'smooth' })
			element.files = files
			triggerEvent(element, 'input')
			triggerEvent(element, 'change')
			return true
		} else return false
	}
	static elementCatcher = {
		catch: async function (tagName: any) {
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
		terminate: async function () {
			if (window.elementCatcher) {
				document.createElement = window.elementCatcher.originalFunc
				delete window.elementCatcher.originalFunc
				delete window.elementCatcher.tagName
				return true
			} else return false
		},
		clear: async function () {
			if (window.elementCatcher) {
				if (window.elementCatcher.originalFunc) document.createElement = window.elementCatcher.originalFunc
				delete window.elementCatcher
				return true
			} else return false
		}
	}
	static manualClick = {
		enable: async function () {
			if (!window.manualClickPreventer) return false
			window.manualClickPreventer.remove()
			delete window.manualClickPreventer
			return true
		},
		disable: async function () {
			if (window.manualClickPreventer) return false
			window.manualClickPreventer = document.createElement('div')
			window.manualClickPreventer.style = 'width: 100%; height: 100%; position: fixed; top: 0; cursor: not-allowed; z-index: 12500; left: 0;'
			window.manualClickPreventer.addEventListener('contextmenu', (event: { preventDefault: () => any }) => event.preventDefault())
			document.body.appendChild(window.manualClickPreventer)
			return true
		}
	}
	static tryLimit: number = 150
	static delay: number = 250
}