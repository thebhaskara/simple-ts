const getStyleElement = (element: Document | ShadowRoot) => {
	// Check if the style element already exists
	const style = element.getElementById("class-interpreter")
	if (style) return style

	const newStyle = document.createElement("style")
	newStyle.id = "class-interpreter"
	newStyle.appendChild(document.createTextNode(""))
	if (element instanceof Document) {
		element.head.appendChild(newStyle)
	} else {
		element.appendChild(newStyle)
	}
	return newStyle
}

// CSS properties shorthand map
const shorthandMap = {
	bg: "background",
	d: "display",
	fd: "flex-direction",
	fw: "flex-wrap",
	jc: "justify-content",
	ai: "align-items",
	ac: "align-content",
	as: "align-self",
	fg: "flex-grow",
	fb: "flex-basis",
	fl: "float",
	clr: "clear",
	m: "margin",
	mt: "margin-top",
	mr: "margin-right",
	mb: "margin-bottom",
	ml: "margin-left",
	mx: "margin-inline",
	my: "margin-block",
	p: "padding",
	pt: "padding-top",
	pr: "padding-right",
	pb: "padding-bottom",
	pl: "padding-left",
	px: "padding-inline",
	py: "padding-block",
	pos: "position",
	t: "top",
	r: "right",
	b: "bottom",
	l: "left",
	z: "z-index",
	br: "border-radius",
	g: "gap",
	fs: "font-size",
	bs: "box-shadow",
	ta: "text-align",
	va: "vertical-align",
	ls: "letter-spacing",
	lh: "line-height",
	ws: "white-space",
	o: "overflow",
	to: "text-overflow",
	v: "visibility",
	w: "width",
	h: "height",
}

let mediaQueryShorthandMap = {
	screen: "only screen",
	print: "only print",

	"min-xs": "(min-width: 0px)",
	"min-sm": "(min-width: 576px)",
	"min-md": "(min-width: 768px)",
	"min-lg": "(min-width: 992px)",
	"min-xl": "(min-width: 1200px)",
	"min-xxl": "(min-width: 1400px)",
	"min-xxxl": "(min-width: 1600px)",
	"max-xs": "(max-width: 575.98px)",
	"max-sm": "(max-width: 767.98px)",
	"max-md": "(max-width: 991.98px)",
	"max-lg": "(max-width: 1199.98px)",
	"max-xl": "(max-width: 1399.98px)",
	"max-xxl": "(max-width: 1599.98px)",
	"max-xxxl": "(max-width: 1799.98px)",
}

export function classToStyle(element: Document | ShadowRoot = document) {
	const style = getStyleElement(element)
	const styles = new Map()
	element.querySelectorAll("[class]").forEach((element) => {
		element.classList.forEach((className) => createStylesForClassName(className, styles))
	})
	let html = Array.from(styles.values()).join("\n")
	if (html === style.innerHTML) return
	style.innerHTML = html
}

setTimeout(classToStyle, 100)

export function observerMutationsAndApplyClassToStyle() {
	// Create a new MutationObserver instance
	const observer = new MutationObserver(() => {
		setTimeout(classToStyle, 1)
	})

	// Start observing mutations on the entire document
	observer.observe(document, { subtree: true, childList: true, attributes: true, characterData: true })
}

function createStylesForClassName(className: string, styles: Map<string, string>) {
	if (!className.includes("|")) return
	if (styles.has(className)) return

	let sClassName = className.replace(/([:\+#\(\)\[\],%\|\&\.\>\<])/g, "\\$1")
	let [property, value, selector, mediaquery] = className.split("|")
	property = shorthandMap[property as keyof typeof shorthandMap] ?? property
	value = value
		.split("_")
		.map((v) => (v.startsWith("--") ? `var(${v})` : v))
		.join(" ")

	let rule = ""
	if (selector) {
		let sanitizedSelector = selector.replace(/[_]+/g, " ").replace(/[\&]+/g, `.${sClassName}`)
		rule = `${sanitizedSelector} { ${property}: ${value} }`
	} else rule = `.${sClassName} { ${property}: ${value} }`

	if (mediaquery?.trim()) {
		let query = mediaquery
			.split("+")
			.map((q) => mediaQueryShorthandMap[q as keyof typeof mediaQueryShorthandMap] ?? `(${q})`)
			.join(" and ")
		rule = `@media ${query} { ${rule} }`
	}
	styles.set(className, rule)
}
