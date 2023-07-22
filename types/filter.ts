interface Base {
	$max?: number;
	$only?: string[];
	$omit?: string[];
	$order?: {
		type: 'desc' | 'asc';
		by: string;
	};

	$regex?:
		| {
				by: string;
				value: RegExp | string;
		  }
		| {
				by: string;
				value: RegExp | string;
		  }[];

	$ne?:
		| {
				by: string;
				value?: any;
		  }
		| {
				by: string;
				value?: any;
		  }[];

	$gt?:
		| {
				by: string;
				value: number;
		  }
		| {
				by: string;
				value: number;
		  }[];
	$lt?:
		| {
				by: string;
				value: number;
		  }
		| {
				by: string;
				value: number;
		  }[];
}

export default interface IFilter<T extends IFilterWithoutMax> extends Base {
	$and?: Base | Base[];
	$or?: (Partial<Omit<T, '$save' | '$delete'>> | IFilterWithoutMax)[];
}

export interface IFilterWithoutMax extends Omit<Base, '$max'> {
	[key: string]: any;
}
