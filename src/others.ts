export interface ActionOptions {
	scrollToElementBeforeAction: boolean
	scrollIntoViewOptions: ScrollIntoViewOptions
}

export interface PageConfigurations extends ActionOptions {
	tryLimit: number
	delay: number
}

export const defaultActionOptions: ActionOptions = {
	scrollToElementBeforeAction: true,
	scrollIntoViewOptions: {
		behavior: 'smooth',
		block: 'center'
	}
}

export const defaultPageConfigurations: PageConfigurations = {
	tryLimit: 30,
	delay: 1000,
	...defaultActionOptions
}