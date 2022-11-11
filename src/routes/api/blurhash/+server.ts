import { error, json } from "@sveltejs/kit"
import { decode, encode } from "blurhash"
import sharp from "sharp"

import type { RequestHandler } from "./$types"

type Format = "png" | "jpeg" | "webp"

interface RequestBody {
	image: string | File

	quality?: number

	format?: Format

	x_components?: number

	y_components?: number
}

export const POST: RequestHandler = async ({ request, fetch }) => {
	const form = await request.formData()

	// eslint-disable-next-line @typescript-eslint/ban-ts-comment
	// @ts-ignore
	const body: RequestBody = Object.fromEntries(form.entries())

	let buffer = null

	const {
		quality = 100,
		x_components = 4,
		y_components = 4,
		image,
		format,
	} = body

	const _quality = Number(quality)

	const _x_components = Number(x_components)

	const _y_components = Number(y_components)

	if (!image) throw error(400, "Missing image field")

	if (isNaN(_quality)) throw error(400, "quality field is not valid number")

	if (isNaN(_x_components))
		throw error(400, "x_components field is not valid number")

	if (isNaN(_y_components))
		throw error(400, "y_components field is not valid number")

	if (typeof image === "string") {
		const res = await fetch(image)
		if (!res.ok) throw error(400, "Invalid image url")

		buffer = Buffer.from(await res.arrayBuffer())
	} else {
		buffer = Buffer.from(await image.arrayBuffer())
	}

	const { data, info } = await sharp(buffer)
		.ensureAlpha()
		.raw()
		.toBuffer({ resolveWithObject: true })

	const _format = format || (info.format as Format)

	const hash = encode(
		new Uint8ClampedArray(data),
		info.width,
		info.height,
		_x_components,
		_y_components
	)

	const decoded = decode(hash, info.width, info.height)

	const blur_image = sharp(decoded, {
		raw: {
			width: info.width,
			height: info.height,
			channels: 4,
		},
	})

	const blur_buffer = await blur_image
		.toFormat(_format, { quality: _quality })
		.toBuffer()

	return json({
		hash: { result: hash, width: info.width, height: info.height },
		image: blur_buffer.toString("base64"),
	})
}
