interface Base {
    $max?: number;
    $only?: string[];
    $omit?: string[];
    $order?: {
        type: 'desc' | 'asc';
        by: string;
    };
}

export default interface IFilter<T extends IFilterWithoutMax> extends Base {
    $or?: (Partial<Omit<T, '$save' | '$delete'>> | IFilterWithoutMax)[];
}

export interface IFilterWithoutMax extends Omit<Base, '$max'> {
    [key: string]: any;
}
