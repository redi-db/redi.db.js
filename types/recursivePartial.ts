type RecursivePartial<T> = {
	[P in keyof T]?: T[P] extends Record<string, any> ? RecursivePartial<T[P]> : T[P];
};

export default RecursivePartial;
