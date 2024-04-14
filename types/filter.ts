import type RecursivePartial from './recursivePartial';

interface Base {
	$max?: number;
	$only?: string[];
	$omit?: string[];
	$order?: {
		type: 'desc' | 'asc';
		by: string;
	};

	$arr?: {
		by: string;
		value: number | boolean | string | { [key: string]: any };
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

export default interface IFilter<T extends IFilterWithoutMax> extends RecursivePartial<Base> {
	$and?: RecursivePartial<T & Base> | RecursivePartial<T & Base>[];
	$or?: (RecursivePartial<Omit<T, '$save' | '$delete'>> | IFilterWithoutMax)[];
}

interface IFilterWithoutMax extends RecursivePartial<Omit<Base, '$max'>> {
	[key: string]: any;
}
