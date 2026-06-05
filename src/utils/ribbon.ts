interface RibbonOptions {
	/** 色带颜色 HSL 饱和度 */
	colorSaturation: string;
	/** 色带颜色 HSL 亮度量 */
	colorBrightness: string;
	/** 色带颜色不透明度量 */
	colorAlpha: number;
	/** 在 HSL 颜色空间中循环颜色的速度有多快 */
	colorCycleSpeed: number;
	/** 每侧 Y 轴上的起始位置 (top|min, middle|center, bottom|max, random) */
	verticalPosition: string;
	/** 到达屏幕另一边的速度有多快 */
	horizontalSpeed: number;
	/** 在任何给定时间屏幕上保留多少条色带 */
	ribbonCount: number;
	/** 添加笔划和功能区填充颜色 */
	strokeSize: number;
	/** 按页面滚动上的系数垂直移动功能区 */
	parallaxAmount: number;
	/** 随时间向每个功能区区域添加动画效果 */
	animateSections: boolean;
}

interface ScreenInfo {
	width: number;
	height: number;
	ratio: number;
	centerx: number;
	centery: number;
	scrollx: number;
	scrolly: number;
}

type RibbonDir = "left" | "right";

interface RibbonSection {
	point1: Point;
	point2: Point;
	point3: Point;
	color: number;
	delay: number;
	dir: RibbonDir;
	alpha: number;
	phase: number;
}

function screenInfo(): ScreenInfo {
	const d = document.documentElement;
	const b = document.body;
	const width = Math.max(0, window.innerWidth || d.clientWidth || b.clientWidth || 0);
	const height = Math.max(0, window.innerHeight || d.clientHeight || b.clientHeight || 0);
	const scrollx = Math.max(0, window.pageXOffset || d.scrollLeft || b.scrollLeft || 0) - (d.clientLeft || 0);
	const scrolly = Math.max(0, window.pageYOffset || d.scrollTop || b.scrollTop || 0) - (d.clientTop || 0);
	return {
		width,
		height,
		ratio: width / height,
		centerx: width / 2,
		centery: height / 2,
		scrollx,
		scrolly,
	};
}

/** [min, max) 区间内的随机数 */
function random(min: number, max: number): number {
	return Math.random() * (max - min) + min;
}

class Point {
	x: number;
	y: number;

	constructor(x = 0, y = 0) {
		this.x = x;
		this.y = y;
	}

	copy(point: Point): this {
		this.x = point.x || 0;
		this.y = point.y || 0;
		return this;
	}

	add(x = 0, y = 0): this {
		this.x += x;
		this.y += y;
		return this;
	}

	subtract(x = 0, y = 0): this {
		this.x -= x;
		this.y -= y;
		return this;
	}
}

class Ribbons {
	private _canvas: HTMLCanvasElement | null = null;
	private _context: CanvasRenderingContext2D | null = null;
	private _width = 0;
	private _height = 0;
	private _scroll = 0;
	private _raf = 0;
	private _ribbons: (RibbonSection[] | null)[] = [];
	private _options: RibbonOptions = {
		colorSaturation: "80%",
		colorBrightness: "60%",
		colorAlpha: 0.65,
		colorCycleSpeed: 6,
		verticalPosition: "random",
		horizontalSpeed: 200,
		ribbonCount: 5,
		strokeSize: 0,
		parallaxAmount: -0.5,
		animateSections: true,
	};

	constructor(options?: Partial<RibbonOptions>) {
		this._onDraw = this._onDraw.bind(this);
		this._onResize = this._onResize.bind(this);
		this._onScroll = this._onScroll.bind(this);
		this.setOptions(options);
		this.init();
	}

	setOptions(options?: Partial<RibbonOptions>): void {
		if (options && typeof options === "object") {
			for (const key in options) {
				if (Object.prototype.hasOwnProperty.call(options, key)) {
					(this._options as unknown as Record<string, unknown>)[key] = (options as Record<string, unknown>)[key];
				}
			}
		}
	}

	init(): void {
		try {
			const canvas = document.createElement("canvas");
			Object.assign(canvas.style, {
				display: "block",
				position: "fixed",
				margin: "0",
				padding: "0",
				border: "0",
				outline: "0",
				left: "0",
				top: "0",
				width: "100%",
				height: "100%",
				zIndex: "-1",
				backgroundColor: "rgba(223, 223, 223, 0.3)",
			});
			canvas.id = "bgCanvas";
			this._canvas = canvas;
			this._onResize();
			this._context = canvas.getContext("2d");
			if (!this._context) return;
			this._context.clearRect(0, 0, this._width, this._height);
			this._context.globalAlpha = this._options.colorAlpha;
			window.addEventListener("resize", this._onResize, { passive: true });
			window.addEventListener("scroll", this._onScroll, { passive: true });
			document.body.appendChild(canvas);
		} catch {
			return;
		}
		this._onDraw();
	}

	/** 停止动画并清理 canvas、事件监听 */
	destroy(): void {
		if (this._raf) {
			cancelAnimationFrame(this._raf);
			this._raf = 0;
		}
		window.removeEventListener("resize", this._onResize);
		window.removeEventListener("scroll", this._onScroll);
		if (this._canvas && this._canvas.parentNode) {
			this._canvas.parentNode.removeChild(this._canvas);
		}
		this._canvas = null;
		this._context = null;
		this._ribbons = [];
	}

	addRibbon(): void {
		const dir: RibbonDir = Math.round(random(1, 9)) > 5 ? "right" : "left";
		const hide = 200;
		const min = 0 - hide;
		const max = this._width + hide;
		const startx = dir === "right" ? min : max;
		let starty = Math.round(random(0, this._height));
		if (/^(top|min)$/i.test(this._options.verticalPosition)) {
			starty = hide;
		} else if (/^(middle|center)$/i.test(this._options.verticalPosition)) {
			starty = this._height / 2;
		} else if (/^(bottom|max)$/i.test(this._options.verticalPosition)) {
			starty = this._height - hide;
		}

		const ribbon: RibbonSection[] = [];
		const point1 = new Point(startx, starty);
		const point2 = new Point(startx, starty);
		let color = Math.round(random(0, 360));
		let delay = 0;
		let stop = 1000;

		while (stop > 0) {
			stop--;
			const movex = Math.round((Math.random() - 0.2) * this._options.horizontalSpeed);
			const movey = Math.round((Math.random() - 0.5) * (this._height * 0.25));
			const point3 = new Point().copy(point2);
			if (dir === "right") {
				point3.add(movex, movey);
				if (point2.x >= max) break;
			} else {
				point3.subtract(movex, movey);
				if (point2.x <= min) break;
			}
			ribbon.push({
				point1: new Point(point1.x, point1.y),
				point2: new Point(point2.x, point2.y),
				point3,
				color,
				delay,
				dir,
				alpha: 0,
				phase: 0,
			});
			point1.copy(point2);
			point2.copy(point3);
			delay += 4;
			color += this._options.colorCycleSpeed;
		}
		this._ribbons.push(ribbon);
	}

	private _drawRibbonSection(section: RibbonSection | undefined): boolean {
		if (!section || !this._context) return false;
		if (section.phase >= 1 && section.alpha <= 0) {
			return true;
		}
		if (section.delay <= 0) {
			section.phase += 0.005;
			section.alpha = Math.sin(section.phase);
			section.alpha = section.alpha <= 0 ? 0 : section.alpha;
			section.alpha = section.alpha >= 1 ? 1 : section.alpha;
			if (this._options.animateSections) {
				const mod = Math.sin(1 + (section.phase * Math.PI) / 2) * 0.1;
				if (section.dir === "right") {
					section.point1.add(mod, 0);
					section.point2.add(mod, 0);
					section.point3.add(mod, 0);
				} else {
					section.point1.subtract(mod, 0);
					section.point2.subtract(mod, 0);
					section.point3.subtract(mod, 0);
				}
				section.point1.add(0, mod);
				section.point2.add(0, mod);
				section.point3.add(0, mod);
			}
		} else {
			section.delay -= 0.5;
		}

		const s = this._options.colorSaturation;
		const l = this._options.colorBrightness;
		const c = `hsla(${section.color}, ${s}, ${l}, ${section.alpha} )`;
		const ctx = this._context;
		ctx.save();
		if (this._options.parallaxAmount !== 0) {
			ctx.translate(0, this._scroll * this._options.parallaxAmount);
		}
		ctx.beginPath();
		ctx.moveTo(section.point1.x, section.point1.y);
		ctx.lineTo(section.point2.x, section.point2.y);
		ctx.lineTo(section.point3.x, section.point3.y);
		ctx.fillStyle = c;
		ctx.fill();
		if (this._options.strokeSize > 0) {
			ctx.lineWidth = this._options.strokeSize;
			ctx.strokeStyle = c;
			ctx.lineCap = "round";
			ctx.stroke();
		}
		ctx.restore();
		return false;
	}

	private _onDraw(): void {
		if (!this._context) return;
		this._context.clearRect(0, 0, this._width, this._height);
		for (let a = 0; a < this._ribbons.length; ++a) {
			const ribbon = this._ribbons[a];
			if (!ribbon) continue;
			const numSections = ribbon.length;
			let numDone = 0;
			for (let b = 0; b < numSections; ++b) {
				if (this._drawRibbonSection(ribbon[b])) {
					numDone++;
				}
			}
			if (numDone >= numSections) {
				this._ribbons[a] = null;
			}
		}
		this._ribbons = this._ribbons.filter((ribbon) => ribbon !== null);
		if (this._ribbons.length < this._options.ribbonCount) {
			this.addRibbon();
		}
		this._raf = requestAnimationFrame(this._onDraw);
	}

	private _onResize(): void {
		const screen = screenInfo();
		this._width = screen.width;
		this._height = screen.height;
		if (this._canvas) {
			this._canvas.width = this._width;
			this._canvas.height = this._height;
			if (this._context) {
				this._context.globalAlpha = this._options.colorAlpha;
			}
		}
	}

	private _onScroll(): void {
		this._scroll = screenInfo().scrolly;
	}
}

let instance: Ribbons | null = null;

export default {
	dom(): HTMLElement | null {
		return document.getElementById("bgCanvas");
	},
	stop(): void {
		if (instance) {
			instance.destroy();
			instance = null;
		}
	},
	start(options?: Partial<RibbonOptions>): void {
		if (instance) instance.destroy();
		instance = new Ribbons(options);
	},
};
