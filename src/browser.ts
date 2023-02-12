import Page from './page'

export default class Browser {
	availablePages: Page[] = []
	onPageAdded?: Function
	beforeUnloadListener = (event: Event) => {
		event.preventDefault()
		this.close()
	}
	onPageClose(closedTabId: number) {
		const index = this.availablePages.findIndex(({ tabId }) => tabId === closedTabId)
		if (index !== -1) this.availablePages.splice(index, 1)
	}
	onPageCloseListener: Function
	constructor() {
		addEventListener('beforeunload', this.beforeUnloadListener, { capture: true })
		this.onPageCloseListener = this.onPageClose.bind(this)
		chrome.tabs.onRemoved.addListener(this.onPageCloseListener as any)
	}
	pages() {
		return this.availablePages
	}
	async close() {
		removeEventListener('beforeunload', this.beforeUnloadListener, { capture: true })
		chrome.tabs.onRemoved.removeListener(this.onPageCloseListener as any)
		await Promise.all(
			this.availablePages.map(async (page: any) => {
				const { tabId, originWindowId, activeInOrigin, onBeforeClose } = page
				if (onBeforeClose) onBeforeClose()
				if (!originWindowId) await page.close()
				else {
					await chrome.tabs.move(tabId, {
						index: -1,
						windowId: originWindowId
					})
					if (activeInOrigin)
						await chrome.tabs.update(tabId, {
							active: true
						})
				}
			})
		)
		this.availablePages = []
	}
	async newPage(
		{ tabId, windowId, originWindowId, activeInOrigin, windowOptions, tabOptions } = {} as {
			tabId?: number
			windowId?: number
			originWindowId?: number
			activeInOrigin?: boolean
			windowOptions?: chrome.windows.CreateData
			tabOptions?: chrome.tabs.CreateProperties | chrome.tabs.UpdateProperties
		}
	): Promise<Page> {
		if (windowId) {
			if (tabId) {
				if (tabOptions) await chrome.tabs.update(tabId, tabOptions)
			} else
				await chrome.tabs
					.create({
						url: 'about:blank',
						...tabOptions
					})
					.then(createdTab => {
						tabId = createdTab.id
					})
		} else {
			await (
				chrome.windows.create({
					type: 'popup',
					focused: true,
					width: 1000,
					left: Math.round((screen.availWidth - 1000) * 0.5),
					height: 650,
					top: Math.round((screen.availHeight - 650) * 0.5),
					...(tabId ? { tabId } : { url: 'about:blank' }),
					...(windowOptions || {})
				}) as any
			).then((createdWindow: { tabs: { id: any }[]; id: any }) => {
				tabId = createdWindow.tabs[0].id
				windowId = createdWindow.id
			})
			if (tabOptions) await chrome.tabs.update(tabId as any, tabOptions)
		}
		const page = new Page({ tabId, windowId, ...(originWindowId ? { originWindowId, activeInOrigin: activeInOrigin || false } : {}) })
		this.availablePages.push(page)
		this?.onPageAdded?.(page)
		return page
	}
}