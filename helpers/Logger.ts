export const LogIdByRef = new Map<any, number>()
const commonRef = Symbol("commonRef")
LogIdByRef.set(commonRef, 0)

let _settings = {
	showId: true,
	showTimestamp: true,
	showStack: false,
	showJSONStringify: true,
}

let logCbs: ((reference: any, ...messages: any[]) => void)[] = []

export function logInit(settings: Partial<typeof _settings>) {
	_settings = { ..._settings, ...settings }
	logCbs = []
	if (_settings.showTimestamp) logCbs.push(() => `[${new Date().toISOString()}]`)
	if (_settings.showId) logCbs.push((reference) => `[${LogIdByRef.get(reference ?? commonRef)}]`)
	if (_settings.showStack)
		logCbs.push(() => {
			const stack = new Error().stack || ""
			const stackLines = stack.split("\n")
			return stackLines
				.reverse()
				.map((line) => {
					if (!line.includes("at ")) return
					if (line.includes("node:")) return
					if (line.includes("node_modules/")) return
					const [, functionName, fileDetail] = line.trim().split(" ")
					if (functionName === "log") return
					if (functionName === "logInit") return
					if (functionName === "processTicksAndRejections") return
					const [col, row, fileName] =
						fileDetail
							?.split(/[\(\)\/\:]/)
							.filter((a) => a)
							.reverse() ?? []
					return `${functionName}(${fileName}:${row})`
				})
				.filter((line) => line)
				.join(" -> ")
		})
	if (_settings.showJSONStringify)
		logCbs.push((reference, ...messages) => messages.map((message) => JSON.stringify(message)).join(" "))
}

export function log(reference: any, ...messages: any[]) {
	const logParts = logCbs.map((cb) => cb(reference, ...messages))
	console.log(logParts.filter((part) => part).join(" "))
}

export const loggerIdExpressMiddleware = (req: any, res: any, next: Function) => {
	LogIdByRef.set(req, LogIdByRef.size + 1)
	res.on("finish", () => {
		LogIdByRef.delete(req)
	})
	next()
}