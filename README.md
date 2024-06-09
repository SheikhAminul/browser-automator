browser-automator<br>
[![NPM Version](https://img.shields.io/npm/v/browser-automator.svg?branch=main)](https://www.npmjs.com/package/browser-automator)
[![Publish Size](https://badgen.net/packagephobia/publish/browser-automator)](https://packagephobia.now.sh/result?p=browser-automator)
[![Downloads](https://img.shields.io/npm/dt/browser-automator)](https://www.npmjs.com/package/browser-automator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/SheikhAminul/browser-automator/blob/main/LICENSE)
================

### Puppeteer alternative for Chrome extensions.
Whether you are developing a Chrome extension or need to automate tasks in your favorite Chrome extension, browser-automator offers a Puppeteer-like experience tailored for Chrome extensions. It provides a simple and efficient way to interact with Chrome browser pages. It allows you to control the browser programmatically. Perfect for Chrome extension-based web scraping and automation purposes.


## Table of Contents

*   [Install](#install)
*   [Usage](#usage)
*   [API Reference](#api-reference)
*   [Contributing](#contributing)
*   [License](#license)
*   [Author](#author)


## Install

```plaintext
npm i browser-automator
```


## Usage

A minimal example to automate Goolge search:

```javascript
import automator from 'browser-automator'

const browser = automator.launch()
const page = await browser.newPage()

await page.goto('https://www.google.com')
await page.waitForSelector('textarea[type="search"]')
await page.input('textarea[type="search"]', 'Who owns Google?')
await page.click('input[type="submit"]')

await page.waitForSelector('[class*="header"]')
const result = await page.evaluate((selector) => {
	return document.querySelector(selector)?.innerText?.trim()
}, ['div[class*="header"]'])
console.log(result)
```

## API Reference

### Namespace: `automator`

A namespace that provides functions for launching the browser automation process.

- `launch(): Browser`

  Launches a new Browser instance for browser automation.

  - Returns: A new Browser instance for browser automation.


### Class: `Page`

Represents a Page instance for interacting with Chrome browser pages.

#### Properties

- `tabId` (number) - The ID of the Chrome tab.
- `windowId` (number) - The ID of the Chrome window.
- `tryLimit` (number) - The maximum number of attempts for waiting operations. Default: 50.
- `delay` (number) - The delay between attempts in milliseconds. Default: 750.
- `onBeforeClose` (Function) - Callback function to be executed before closing the page.

#### Constructor

* #### `constructor(options: { tabId: number; windowId: number })`

  Creates a new Page instance for a specific Chrome tab with the given `tabId` and `windowId`.

  - `options` (Object)
    - `tabId` (number) - The unique identifier of the Chrome tab associated with this Page instance.
    - `windowId` (number) - The unique identifier of the Chrome window containing the tab.

#### Methods

* #### `goto(url: string, options?: { waitUntil: 'load' | 'domcontentloaded' }): Promise<void>`

  Navigate to the specified URL.

  - `url` (string) - The URL to navigate to.
  - `options` (Object, optional)
    - `waitUntil` (string) - When to consider navigation as complete ('load' or 'domcontentloaded'). Default: 'domcontentloaded'.

* #### `reload(): Promise<void>`

  Reloads the current page.

* #### `url(): Promise<string>`

  Get the current URL of the page.

* #### `close(): Promise<void>`

  Close the current page.

* #### `zoom(zoomFactor: number): Promise<void>`

  Zoom the current page.

  - `zoomFactor` (number) - The new zoom factor. Use a value of 0 here to set the tab to its current default zoom factor. Values greater than zero specify a (possibly non-default) zoom factor for the tab.

* #### `bringToFront(): Promise<void>`

  Brings the Chrome browser window associated with the page to the front.

* #### `hideFromFront(): Promise<void>`

  Hides the Chrome browser window associated with the page.

* #### `evaluate(options: object): Promise<any>`

  Evaluates JavaScript code on the page.

  - `options` (Object)
    - `func` (Function, optional) - The function to evaluate.
    - `files` (string[], optional) - An array of script file paths to evaluate.
    - `args` (any[], optional) - Arguments to pass to the evaluated function.
    - `world` ('ISOLATED' | 'MAIN', optional) - The world context for evaluation (default is 'MAIN').
    - `allFrames` (boolean, optional) - Indicates whether to evaluate in all frames (default is false).
    - `frameIds` (number[], optional) - An array of frame identifiers where the evaluation should take place.
    - `documentIds` (string[], optional) - An array of document identifiers for the frames to evaluate in.

* #### `evaluate(func: Function, args?: any[], options?: object): Promise<any>`

  Evaluates a function on the page.

  - `func` (Function) - The function to evaluate.
  - `args` (any[], optional) - Arguments to pass to the function.
  - `options` (Object, optional)
    - `world` ('ISOLATED' | 'MAIN') - The world context for evaluation (default is 'MAIN').
    - `allFrames` (boolean) - Indicates whether to evaluate in all frames (default is false).
    - `frameIds` (number[]) - An array of frame identifiers where the evaluation should take place.
    - `documentIds` (string[]) - An array of document identifiers for the frames to evaluate in.

* #### `evaluate(files: string[], args?: any[], options?: object): Promise<any>`

  Evaluates JS files on the page.

  - `files` (string[]) - An array of script file paths to evaluate.
  - `args` (any[], optional) - Arguments to pass to the function.
  - `options` (Object, optional)
    - `world` ('ISOLATED' | 'MAIN') - The world context for evaluation (default is 'MAIN').
    - `allFrames` (boolean) - Indicates whether to evaluate in all frames (default is false).
    - `frameIds` (number[]) - An array of frame identifiers where the evaluation should take place.
    - `documentIds` (string[]) - An array of document identifiers for the frames to evaluate in.

* #### `waitFor(func: Function, args: any[], options?: { tryLimit?: number; delay?: number }): Promise<any>`

  Waits for a function to return a truthy value.

  - `func` (Function) - The function representing the condition to wait for.
  - `args` (any[]) - Arguments to pass to the function.
  - `options` (Object, optional)
    - `tryLimit` (number) - The maximum number of attempts to wait for the condition (default is this.tryLimit).
    - `delay` (number) - The delay in milliseconds between attempts (default is this.delay).

* #### `waitForNavigation(options?: { tryLimit?: number; delay?: number }): Promise<void>`

  Waits for the page to navigate to a new URL.

  - `options` (Object, optional)
    - `tryLimit` (number) - The maximum number of attempts to wait for navigation (default is 50).
    - `delay` (number) - The delay between each attempt in milliseconds (default is 750).

* #### `waitForSelector(selectors: string, options?: { tryLimit?: number; delay?: number }, index: number = -1): Promise<void>`

  Waits for an element matching the given CSS selector to become available.

  - `selectors` (string) - The CSS selector to wait for.
  - `options` (Object, optional)
    - `tryLimit` (number) - The maximum number of attempts to find the element (default is 1000).
    - `delay` (number) - The delay between attempts in milliseconds (default is 750).
  - `index` (number, optional) - The index of the element if multiple elements match the selector.

* #### `waitForSelectorMiss(selectors: string, options?: { tryLimit?: number; delay?: number }, index: number = -1): Promise<void>`

  Waits for an element matching the given selector to disappear from the page.

  - `selectors` (string) - The CSS selector or XPath expression to check for element absence.
  - `options` (Object, optional)
    - `tryLimit` (number) - The maximum number of attempts (default is 1000).
    - `delay` (number) - The delay in milliseconds between attempts (default is 750ms).
  - `index` (number, optional) - The index of the element if there are multiple matches.

* #### `waitForXPath(expression: any, options?: { tryLimit?: number; delay?: number }, index: number = -1): Promise<void>`

  Waits for an element matching the given XPath expression to appear in the page.

  - `expression` (any) - The XPath expression to wait for.
  - `options` (Object, optional)
    - `tryLimit` (number) - The maximum number of attempts to find the element (default is 1000).
    - `delay` (number) - The delay in milliseconds between attempts (default is 750ms).
  - `index` (number, optional) - The index of the element to interact with.

* #### `elementExists(selectors: string, index: number = -1): Promise<boolean>`

  Checks if an element specified by the CSS selector or XPath expression exists on the page.

  - `selectors` (string) - The CSS selector or XPath expression to check for existence.
  - `index` (number) - The index of the element to check.

* #### `click(selectors: string, index: number = -1): Promise<void>`

  Clicks on the element specified by the CSS selector or XPath expression.

  - `selectors` (string) - The CSS selector or XPath expression to click on.
  - `index` (number) - The index of the element to interact with.

* #### `execCopy(text: string): void`

  Copies text to the clipboard.

  - `text` (string) - The text to copy to the clipboard.

* #### `execPaste(selectors: string, index: number = -1): Promise<void>`

  Pastes text from the clipboard to an element specified by the CSS selector or XPath expression.

  - `selectors` (string) - The CSS selector or XPath expression of the target element.
  - `index` (number) - The index of the element to interact with (default is -1).

* #### `triggerEvent(selectors: string, type: any, index: number = -1): Promise<void>`

  Triggers an event on the element specified by the CSS selector or XPath expression.

  - `selectors` (string) - The CSS selector or XPath expression of the target element.
  - `type` (string) - The type of event to trigger.
  - `index` (number) - The index of the element to interact with.

* #### `input(selectors: string, value: any, index: number = -1): Promise<void>`

  Inputs a value into the element specified by the CSS selector or XPath expression.

  - `selectors` (string) - The CSS selector or XPath expression of the target element.
  - `value` (any) - The value to input.
  - `index` (number) - The index of the element to interact with.

* #### `uploadFiles(files: (File | { name: string, blob: Blob, dataUrl?: string, blobUrl?: string } | any)[], selectors: string, caughtElementIndex: number): Promise<void>`

  Uploads files to an input element specified by the CSS selector or XPath expression.

  - `files` (Array) - An array of files to upload, where each file can be a File object or an object with name, blob, dataUrl, and blobUrl properties.
  - `selectors` (string) - The CSS selector or XPath expression of the input element.
  - `caughtElementIndex` (number) - The index of the element to interact with (default is -1).

* #### `screenshot(options: { clip?: { x: number; y: number; width: number; height: number } }): Promise<string>`

  Takes a screenshot of the visible area of the page.

  - `options` (Object, optional)
    - `clip` (Object) - Optional clipping parameters.


### Class: `Browser`

Represents a Browser instance for interacting with Chrome browser pages.

#### Properties

- `availablePages` (Page[]) - An array of available Page instances within the browser.
- `onPageAdded` (Function) - A callback function that is invoked when a new page is added to the browser.
- `onPageCloseListener` (Function) - A function to listen for page close events.

#### Constructor

* #### `constructor()`

  Creates a new Browser instance.

#### Methods

* #### `newPage({ tabId, windowId, originWindowId, activeInOrigin, windowOptions, tabOptions }): Promise<Page>`

  Creates a new Page instance and associates it with the browser.

  - `tabId` (number, optional) - The ID of the tab to use for creating the Page instance. If not supplied, a tab will be created.
  - `windowId` (number, optional) - The ID of the window to open the page in. If not supplied, a window will be created.
  - `originWindowId` (number, optional) - The ID of the tab's origin window (if any).
  - `activeInOrigin` (boolean, optional) - Whether the page should be active in the origin window.
  - `windowOptions` (chrome.windows.CreateData, optional) - Options for creating the window.
  - `tabOptions` (chrome.tabs.CreateProperties | chrome.tabs.UpdateProperties, optional) - Options for creating or updating the tab.

  - Returns: A Promise that resolves with the new Page instance.

* #### `pages(): Page[]`

  Returns an array of available Page instances.

  - Returns: An array of available Page instances.

* #### `onPageClose(closedTabId: number)`

  Event listener for page close events.

  - `closedTabId` (number) - The ID of the closed tab.

* #### `close(): Promise<void>`

  Closes all associated pages in the Browser instance.


## Contributing

You are welcome to contribute! If you are adding a feature or fixing a bug, please contribute to the [GitHub repository](https://github.com/SheikhAminul/browser-automator/).


## License

browser-automator is licensed under the [MIT license](https://github.com/SheikhAminul/browser-automator/blob/main/LICENSE).


## Author

|[![@SheikhAminul](https://avatars.githubusercontent.com/u/25372039?v=4&s=96)](https://github.com/SheikhAminul)|
|:---:|
|[@SheikhAminul](https://github.com/SheikhAminul)|