
export interface ValidatorFunc {
    (value: any): true | string;
}
