import "express-session";

declare module "express-session" {
	interface SessionData {
		viewport?: {
			width: number;
			height: number;
			rem: number;
		};
	}
}
