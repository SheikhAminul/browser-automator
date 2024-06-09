declare global {
	interface Window {
		Self: typeof Self
	}
}

interface PageConfigurations {
	tryLimit: number
	delay: number
	scrollToElementBeforeAction: boolean
	scrollIntoViewOptions: ScrollIntoViewOptions
}

const selfIntegration = (global = true) => {
	const triggerEvent = (element: any, type: string) => {
		element.dispatchEvent(
			new Event(type, {
				bubbles: true,
				cancelable: true
			})
		)
	}

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

	const filesToFileList = (files: FileList) => {
		const dataTransferer = new DataTransfer()
		for (const file of files) dataTransferer.items.add(file)
		return dataTransferer.files
	}

	const dataUrlToFile = (dataUrl: string, name: string) => {
		let [mime, data] = dataUrl.split(',')
		mime = (<any>mime).match(/:(.*?);/)[1]
		data = atob(data)
		let index = data.length,
			dataArray = new Uint8Array(index)
		while (index--) dataArray[index] = data.charCodeAt(index)
		return new File([dataArray], name, { type: mime })
	}

	const getBlob = (url: string) => {
		return new Promise(resolution => {
			var xhr = new XMLHttpRequest()
			xhr.open('GET', url, true)
			xhr.responseType = 'blob'
			xhr.onload = () => resolution(xhr.response)
			xhr.send()
		})
	}

	const blobToFile = (blob: Blob, name: string) => {
		return new File([blob], name, { type: blob.type })
	}

	/**
	 * CSS Selectors and XPath functions. 
	 */
	const isXPath = (expression: string) => {
		return expression.match(/^(\/|\.\/|\()/)
	}
	const getElementByXPath = (expression: string, contextNode: Element | Document = document, index: number = -1) => {
		return (index === -1) ? (
			document.evaluate(expression, contextNode, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue
		) : (
			document.evaluate(expression, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotItem(index)
		)
	}
	const getElementsByXPath = (expression: string, contextNode: Element | Document = document): Element[] => {
		let elements: Element[] = []
		let results = document.evaluate(expression, contextNode, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null)
		for (let index = 0; index < results.snapshotLength; index++) elements.push(results.snapshotItem(index) as any)
		return elements
	}
	const getElementBySelectors = (selectors: string, contextNode: Element | Document = document, index: number = -1) => {
		return (index === -1) ? (
			contextNode.querySelector(selectors)
		) : (
			contextNode.querySelectorAll(selectors)[index]
		)
	}
	const getElementsBySelectors = (selectors: string, contextNode: Element | Document = document): Element[] => {
		return Array.from(contextNode.querySelectorAll(selectors))
	}
	const getElement = (selectors: string, contextNode: Element | Document = document, index: number = -1): Element => {
		return (
			isXPath(selectors) ? (
				getElementByXPath(selectors, contextNode, index)
			) : (
				getElementBySelectors(selectors, contextNode, index)
			)
		) as Element
	}
	const getElements = (selectors: string, contextNode: Element | Document = document): Element[] => {
		return isXPath(selectors) ? (
			getElementsByXPath(selectors, contextNode)
		) : (
			getElementsBySelectors(selectors, contextNode)
		)
	}

	/**
	 * Page method's helper functions.
	 */
	const click = (selectors: string, index: any, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
		const element = getElement(selectors, document, index) as any
		if (element) {
			scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
			element.click()
			return true
		} else return false
	}

	const elementExists = (selectors: string, index: number) => {
		const element = getElement(selectors, document, index) as any
		return element ? true : false
	}

	const execPasteTo = (selectors: string, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
		const element = getElement(selectors, document, index) as any
		if (element) {
			scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
			element.focus()
			if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') element.select()
			document.execCommand('paste')
			return true
		} else return false
	}

	const input = (selectors: string, value: any, index: number, { scrollToElementBeforeAction, scrollIntoViewOptions }: Pick<PageConfigurations, 'scrollIntoViewOptions' | 'scrollToElementBeforeAction'>) => {
		const element = getElement(selectors, document, index) as any
		if (element) {
			scrollToElementBeforeAction && element.scrollIntoView(scrollIntoViewOptions)
			setValue(element, value)
			return true
		} else return false
	}

	const elementCatcher: {
		current?: {
			originalFunc: any,
			elements: Element[],
			tagNames: string[]
		},
		catch: (tagNames: string[]) => boolean,
		terminate: () => boolean
	} = {
		catch: (tagNames) => {
			if (!elementCatcher.current) {
				elementCatcher.current = {
					originalFunc: document.createElement,
					elements: [],
					tagNames: tagNames.map(tagName => tagName.toUpperCase())
				}
				document.createElement = function () {
					const element = elementCatcher.current?.originalFunc.apply(this, arguments)
					if (elementCatcher.current?.tagNames.includes(element.tagName)) elementCatcher.current.elements.push(element)
					return element
				}
				return true
			}
			return false
		},
		terminate: () => {
			if (elementCatcher.current) {
				document.createElement = elementCatcher.current.originalFunc
				delete elementCatcher.current
				return true
			}
			return false
		}
	}

	const manualClick: {
		current?: { element: Element | any },
		enable: Function,
		disable: Function
	} = {
		enable: () => {
			if (manualClick.current) {
				manualClick.current.element.remove()
				delete manualClick.current
			}
		},
		disable: () => {
			if (!manualClick.current) {
				manualClick.current = {
					element: document.createElement('div')
				}
				manualClick.current.element.style = 'width: 100%; height: 100%; position: fixed; top: 0; cursor: not-allowed; z-index: 12500; left: 0;'
				manualClick.current.element.addEventListener('contextmenu', (event: { preventDefault: () => any }) => event.preventDefault())
				document.body.appendChild(manualClick.current.element)
			}
		}
	}

	/**
	* Exportables.
	*/
	const Self = {
		exists: () => true,
		getElement, getElements, getElementBySelectors, getElementsBySelectors, getElementByXPath, getElementsByXPath, triggerEvent, setValue, isXPath, filesToFileList, getBlob, dataUrlToFile, blobToFile,
		click, elementExists, execPasteTo, input, elementCatcher, manualClick
	}
	if (global && !window.Self?.exists?.()) window.Self = Self
	return Self
}

const Self = selfIntegration(false)

export default Self

export { selfIntegration }