
export function ExecuteString(str: string, obj: any) {
	let finalString = `return (${str})`
	if (str.split(/[\n\r;]+/).length > 1) {
		finalString = str
	}
	if (str.indexOf("return ") > -1) {
		finalString = str
	}
	return new Function(...Object.keys(obj), `return ${str}`)(...Object.values(obj))
}


