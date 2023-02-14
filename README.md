browser-automator<br>
[![NPM Version](https://img.shields.io/npm/v/browser-automator.svg?branch=main)](https://www.npmjs.com/package/browser-automator)
[![Publish Size](https://badgen.net/packagephobia/publish/browser-automator)](https://packagephobia.now.sh/result?p=browser-automator)
[![Downloads](https://img.shields.io/npm/dt/browser-automator)](https://www.npmjs.com/package/browser-automator)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/SheikhAminul/browser-automator/blob/main/LICENSE)
================

### Puppeteer alternative for Chrome extensions.
A module for Chrome extensions that functions similarly to Puppeteer. The main purpose of this module is to provide a convenient and easy-to-use interface for interacting with a web page through Chrome's extension APIs. This TypeScript-based node module provides a comprehensive and convenient way of interacting with a web page through Chrome's browser automation APIs. Whether you need to navigate to a specific URL, execute JavaScript code, or wait for specific conditions to be met, this module has got you covered.


## Table of Contents

*   [Install](#install)
*   [Usage](#usage)
*   [Available Methods](#available-methods)
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

const page = await browser.newPage({ tabOptions: { url: 'https://www.google.com' } })
await page.waitForSelector('input[type="text"]')
await page.input('input[type="text"]', 'Hello word!')
await page.click('input[type="submit"]')
```

## Available Methods
- `goto`: Navigate to a target URL and wait for the page to load.

- `reload`: Reload the current page.

- `url`: Get the URL of the current page.

- `close`: Close the current page.

- `bringToFront`: Bring the current page to the front of the window.

- `hideFromFront`: Hide the current page from the front of the window.

- `evaluate`: Execute a JavaScript function in the context of the current page.

- `waitFor`: Wait for a specific condition to be met by periodically checking the result of a JavaScript function.

- `waitForNavigation`: Wait for the URL of the current page to change.

- `waitForSelector`: Wait for a specific DOM element to be present on the page.

- `waitForSelectorMiss`: Wait for a specific DOM element to be absent from the page.

- `waitForXPath`: Wait for a specific XPath expression to match a DOM element on the page.


## License

browser-automator is licensed under the [MIT license](https://github.com/SheikhAminul/browser-automator/blob/main/LICENSE).


## Author

|[![@SheikhAminul](https://avatars.githubusercontent.com/u/25372039?v=4&s=96)](https://github.com/SheikhAminul)|
|:---:|
|[@SheikhAminul](https://github.com/SheikhAminul)|