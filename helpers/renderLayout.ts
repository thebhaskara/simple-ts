type containerType = { name: string; content: string; styles: string[]; flexContainers: Map<string, string> }

const getNames = (str: string) => {
	return [
		...new Set(
			str
				.split("\n")
				.filter((line) => line.startsWith("|") || line.startsWith("---") || line.startsWith("#"))
				.join("\n")
				.split(/[\s|\-\<\>#\[\]]+/)
		),
	].filter(Boolean)
}

export function renderLayout(layout: string) {
	let names = getNames(layout)

	let elementByNames = new Map<string, HTMLDivElement>()
	names.forEach((name) => {
		if (!name) {
			return
		}
		const element = document.createElement("div")
		element.className = name
		// element.textContent = name
		elementByNames.set(name, element)
	})

	let containers: containerType[] = []
	layout.split("\n").forEach((line) => {
		line = line?.trim()
		if (!line) {
			return
		}
		if (line.startsWith("---")) {
			let name = line.replace(/[-| ]/g, "").trim()
			if (name) {
				containers.push({ name, content: "", styles: [], flexContainers: new Map<string, string>() })
			}
			return
		}
		if (line.startsWith("|")) {
			let container = containers[containers.length - 1]
			container.content = [container.content.trim(), line.trim()].filter(Boolean).join("\n")
			return
		}
		if (line.startsWith(".")) {
			let styleContent = line.trim()
			let container = containers[containers.length - 1]
			container?.styles.push(styleContent)
			return
		}
		if (line.startsWith("#")) {
			let flexContent = line.trim()
			let [name, ...items] = flexContent.split(/[#\s\[\]]/).filter(Boolean)
			let container = containers[containers.length - 1]
			container?.flexContainers.set(name, items.join(" "))
			return
		}
	})

	let app = document.querySelector<HTMLDivElement>("#app")

	containers.forEach((container) => {
		let name = container.name
		let contentNames = getNames(container.content)
		let gridTemplateArea = container.content
			.replace(/[| ]+/g, " ")
			.split("\n")
			.map((line) => `"${line.trim()}"`)
			.join(" ")
		let containerElement = elementByNames.get(name)
		containerElement?.style.setProperty("display", "grid")
		containerElement?.style.setProperty("grid-template-areas", gridTemplateArea)
		if (container.styles?.length) {
			let style = document.createElement("style")
			style.textContent = container.styles.join("\n")
			containerElement?.appendChild(style)
		}
		contentNames.forEach((contentName) => {
			let contentElement = elementByNames.get(contentName)
			contentElement && (contentElement.textContent = contentName)
			contentElement?.style.setProperty("grid-area", contentName)
			contentElement && containerElement?.appendChild(contentElement)
		})
		container?.flexContainers.forEach((items, name) => {
			let element = elementByNames.get(name.replace(/[\<\>]/g, ""))
			if (!element) {
				return
			}
			element.style.setProperty("display", "flex")
			items.split(" ").forEach((item) => {
				let itemElement = elementByNames.get(item.replace(/[\<\>]/g, ""))
				if (!itemElement) {
					itemElement = document.createElement("div")
				}
				itemElement.textContent = item
				if (item.startsWith("<")) {
					itemElement.style.setProperty("flex", "1")
				}
				element.appendChild(itemElement)
			})
		})
		containerElement && app?.appendChild(containerElement)
	})
}
