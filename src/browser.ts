import Page from './page'
import { selfIntegration } from './self'

const syncPageIntegration = async (tabId: number) => {
	await chrome.scripting.executeScript({
		target: { tabId },
		func: selfIntegration
	}).catch(() => { })
}

/**
 * Represents a Browser instance for interacting with Chrome browser pages.
 */
export default class Browser {
	/**
	 * An array of available Page instances within the browser.
	 */
	availablePages: Page[] = []

	/**
	 * Creates a new Browser instance.
	 */
	constructor() {
		onbeforeunload = (event: Event) => {
			event.preventDefault()
			this.close()
			return false
		}
		this.syncListeners()
	}

	/**
	 * Returns an array of available Page instances.
	 * @returns An array of available Page instances.
	 */
	pages() {
		return this.availablePages
	}

	/**
	 * Closes all associated pages in the Browser instance.
	 */
	async close() {
		try {
			onbeforeunload = null
			await Promise.all(
				this.availablePages.map(async (page: any) => {
					const { tabId, originWindowId, activeInOrigin, onBeforeClose } = page
					if (onBeforeClose) onBeforeClose()
					if (!originWindowId) await page.close()
					else {
						if (originWindowId !== (await chrome.tabs.get(tabId)).windowId) await chrome.tabs.move(tabId, {
							index: -1,
							windowId: originWindowId
						})
						if (activeInOrigin) await chrome.tabs.update(tabId, {
							active: true
						})
					}
				})
			)
			this.availablePages = []
			this.syncListeners()
		} catch (glitch) { throw glitch }
	}

	/**
	 * Creates a new Page instance and associates it with the browser.
	 * @param tabId - The ID of the tab to use for creating the Page instance. If not supplied a tab will be created.
	 * @param windowId - The ID of the window to open the page in. If not supplied a window will be created.
	 * @param originWindowId - The ID of the tab's origin window. If supplied the tab will be moved in that window when closing the browser-automator instance instead of closing the tab.
	 * @param activeInOrigin - Whether the page/tab should be active in the origin window when moved to the origin window.
	 * @param windowOptions - Options for creating the window.
	 * @param tabOptions - Options for creating or updating the tab.
	 * @returns A Promise that resolves with the new Page instance.
	 */
	async newPage({ tabId, windowId, originWindowId, activeInOrigin, windowOptions, tabOptions }: {
		tabId?: number
		windowId?: number
		originWindowId?: number
		activeInOrigin?: boolean
		windowOptions?: chrome.windows.CreateData
		tabOptions?: chrome.tabs.CreateProperties | chrome.tabs.UpdateProperties
	} = {}): Promise<Page> {
		try {
			if (windowId) {
				if (tabId) {
					if (tabOptions) await chrome.tabs.update(tabId, tabOptions)
				} else
					await chrome.tabs.create({
						url: 'about:blank',
						...tabOptions
					}).then(createdTab => {
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
			const page = new Page({
				browser: this,
				tabId,
				windowId,
				...(
					originWindowId ? {
						originWindowId,
						activeInOrigin: activeInOrigin || false
					} : {}
				)
			} as any)
			this.availablePages.push(page)
			this?.onPageAdded?.(page)
			this.syncListeners()
			syncPageIntegration(tabId as number)
			return page
		} catch (glitch) { throw glitch }
	}

	/**
	 * A callback function that is invoked when a new page is added to the browser.
	 */
	onPageAdded?: Function

	/**
	 * A callback function that is invoked when a page is closed.
	 */
	onPageClose?: (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => void

	/**
	 * A callback function that is invoked when a page is updated.
	 */
	onPageUpdate?: Function

	handleTabRemove = (tabId: number, removeInfo: chrome.tabs.TabRemoveInfo) => {
		const index = this.availablePages.findIndex(({ tabId: id }) => id === tabId)
		if (index !== -1) {
			this?.onPageClose?.(tabId, removeInfo)
			this.availablePages.splice(index, 1)
		}
	}

	handleTabUpdate = (tabId: number, changeInfo: chrome.tabs.TabChangeInfo, tab: chrome.tabs.Tab) => {
		const index = this.availablePages.findIndex(({ tabId: id }) => id === tabId)
		if (index !== -1) {
			this?.onPageUpdate?.(this.availablePages[index])
			if (changeInfo.status === 'complete' && tab.url?.match(/^HTTP/i)) {
				syncPageIntegration(tabId)
			}
		}
	}

	syncListeners() {
		if (this.availablePages.length) {
			if (!chrome.tabs.onUpdated.hasListener(this.handleTabUpdate)) chrome.tabs.onUpdated.addListener(this.handleTabUpdate)
			if (!chrome.tabs.onRemoved.hasListener(this.handleTabRemove)) chrome.tabs.onRemoved.addListener(this.handleTabRemove)
		} else {
			if (chrome.tabs.onUpdated.hasListener(this.handleTabUpdate)) chrome.tabs.onUpdated.removeListener(this.handleTabUpdate)
			if (chrome.tabs.onRemoved.hasListener(this.handleTabRemove)) chrome.tabs.onRemoved.removeListener(this.handleTabRemove)
		}
	}
}