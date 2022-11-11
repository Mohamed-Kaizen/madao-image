import { error, json } from "@sveltejs/kit"
import sharp from "sharp"

import type { RequestHandler } from "./$types"

type Format = "png" | "jpeg" | "webp"

type Fit = "cover" | "contain" | "fill" | "inside" | "outside"

interface RequestBody {
	image: string | File

	quality?: number

	format?: Format

	w?: number

	h?: number

	fit?: Fit

	progressive?: boolean
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const form = await request.formData()

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const body: RequestBody = Object.fromEntries(form.entries())

	let buffer = null

	const {
		quality = 100,
		h,
		w,
		image,
		format,
		fit = "cover",
		progressive = true,
	} = body

	const _quality = Number(quality)

	if (!image) throw error(400, "Missing image field")

	if (isNaN(_quality)) throw error(400, "quality field is not valid number")

	if (typeof image === "string") {
		const res = await fetch(image)
		if (!res.ok) throw error(400, "Invalid image url")

		buffer = Buffer.from(await res.arrayBuffer())
	} else {
		buffer = Buffer.from(await image.arrayBuffer())
	}

	const { info } = await sharp(buffer).toBuffer({ resolveWithObject: true })

	const _w = isNaN(Number(w)) ? info.width : Number(w)

	const _h = isNaN(Number(h)) ? info.height : Number(h)

	const _format = format || (info.format as Format)

	const transform = await sharp(buffer)
		.resize(_w, _h, { fit: fit })
		.toFormat(_format, {
			quality: _quality,
			progressive: Boolean(progressive),
		})
		.toBuffer()

	return json({
		result: transform.toString("base64"),
	})
}
