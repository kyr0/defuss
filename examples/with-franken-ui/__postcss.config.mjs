import combineDuplicatedSelectors from 'franken-ui/postcss/combine-duplicated-selectors'

export default
 {
	plugins: [
		combineDuplicatedSelectors({
			removeDuplicatedProperties: true
		})
	]
};
