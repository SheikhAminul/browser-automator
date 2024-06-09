import Page from './page'

class RemoteElement {
	page: Page
	elementPath: string
	tagName?: string

	async handleCall(key: string, args?: any[]) {
		return await this.page.evaluate({
			func: (elementPath, key, args?: any[]) => args ? window.Self.ElementActions.handleCall(elementPath, key, args) : window.Self.ElementActions.handleCall(elementPath, key),
			args: args ? [this.elementPath, key, args] : [this.elementPath, key]
		})
	}
	async handleGet(key: string) {
		return await this.page.evaluate({
			func: (elementPath, key) => window.Self.ElementActions.handleGet(elementPath, key),
			args: [this.elementPath, key]
		})
	}
	async handleSet(key: string, value: any) {
		return await this.page.evaluate({
			func: (elementPath, key, value) => window.Self.ElementActions.handleSet(elementPath, key, value),
			args: [this.elementPath, key, value]
		})
	}

	async getTagName() {
		if (this.tagName) return this.tagName
		this.tagName = await this.handleGet('tagName')
		return this.tagName
	}
	async getInnerText() {
		return await this.handleGet('innerText')
	}
	async getInnerHTML() {
		return await this.handleGet('innerHTML')
	}
	async setInnerHTML(html: string) {
		return await this.handleSet('innerHTML', html)
	}
	async click() {
		return await this.handleCall('click')
	}
	async focus() {
		return await this.handleCall('focus')
	}
	async scrollIntoView(options?: ScrollIntoViewOptions) {
		return await this.handleCall('scrollIntoView', [options])
	}
	async getAttribute(qualifiedName: string) {
		return await this.handleCall('getAttribute', [qualifiedName])
	}
	async setAttribute(qualifiedName: string, value: string) {
		return await this.handleCall('setAttribute', [qualifiedName, value])
	}

	async getElement(selectors: string, index: number = -1) {
		return await this.page.getElement(selectors, index, this.elementPath)
	}
	async getElements(selectors: string) {
		return await this.page.getElements(selectors, this.elementPath)
	}

	async input(value: any) {
		return await this.page.evaluate({
			func: (value: any, elementPath: string) => {
				const element = window.Self.ElementActions.getElement(elementPath)
				if (!element) return false
				window.Self.setValue(element, value)
				return true
			},
			args: [value, this.elementPath]
		})
	}
	async execPaste() {
		return await this.page.evaluate({
			func: (elementPath: string) => {
				const element = window.Self.ElementActions.getElement(elementPath)
				if (!element) return false
				window.Self.triggerPaste(element)
				return true
			},
			args: [this.elementPath]
		})
	}
	async triggerEvent(type: 'click' | 'input' | 'submit' | 'keydown' | 'keyup' | 'keypress' | 'change' | 'mouseover' | 'mouseout' | 'focus' | 'blur' | 'load' | string) {
		return await this.page.evaluate({
			func: (type: any, elementPath: string) => {
				const element = window.Self.ElementActions.getElement(elementPath)
				if (!element) return false
				window.Self.triggerEvent(element, type)
				return true
			},
			args: [type, this.elementPath]
		})
	}

	constructor(page: Page, elementPath: string, tagName?: string) {
		this.page = page
		this.elementPath = elementPath
		if (tagName) this.tagName = tagName
	}
}

export default RemoteElement