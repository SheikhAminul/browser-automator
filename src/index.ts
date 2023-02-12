import Browser from './browser'

const automator = {
	launch: function () {
		return new Browser()
	}
}

export default automator