/**
 * This module provides exports related to browser automation, including classes for browser control and page interaction.
 *
 * @module browser-automator
 */

import Browser from './browser'
import { doDelay } from './library'
import Page from './page'
import Self, { selfAutomator } from './page-self'

/**
 * A namespace that provides functions for launching the browser automation process.
 *
 * @namespace automator
 */
const automator = {
	/**
	 * Launches a new Browser instance for browser automation.
	 *
	 * @function
	 * @returns {Browser} - A new Browser instance for browser automation.
	 */
	launch: function (): Browser {
		return new Browser()
	}
}

export default automator
export { Browser, Page, Self, selfAutomator, doDelay as delay }