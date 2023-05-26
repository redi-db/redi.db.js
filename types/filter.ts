interface Base {
    $max?: number;
    $only?: string[];
    $omit?: string[];
    $order?: {
        type: 'desc' | 'asc';
        by: string;
    };

    $gt?: {
        by: string;
        value: number;
    }[];
    $lt?: {
        by: string;
        value: number;
    }[];
}

export default interface IFilter<T extends IFilterWithoutMax> extends Base {
    $or?: (Partial<Omit<T, '$save' | '$delete'>> | IFilterWithoutMax)[];
}

export interface IFilterWithoutMax extends Omit<Base, '$max'> {
    [key: string]: any;
}
