import { RouteLocation } from "vue-router";

export interface Grouped<TElement>
{
    [groupBy: string]: TElement[]
}

export interface Grouped2<TElement>
{
    [groupBy: string]: {[groupBy: string]: TElement[]}
}

interface KeyAny { [name: string]:any }
export function toRouteProps(mapping:KeyAny) 
{
    return function(route:RouteLocation) 
    {
        const props:KeyAny = {};
        for (var key in route.params) 
        {
            const type:any = mapping[key];
            if (type === false)
                continue

            const param = route.params[key];
            if (param == null || type == null)
                props[key] = param;
            else if (typeof(type) == 'function') 
                props[key] = type(param);
            else if (type == 'number' && typeof(param) == 'string')
                props[key] = Number.parseInt(param, 10);
            else if (type == 'boolean') 
                props[key] = (param as any) == true;
            else props[key] = param;
        }
        return props;
    }
}

export function cleanGamecoreName(value: string) 
{
    var parts = value.split('.');
    if (parts.length === 3)
        return  parts[2].split(/([A-Z][a-z]+)/).filter(e => e).join(' ');
    return value;
}

export function gamecoreToComponentName(value: string) 
{
    var parts = value.split('.');
    if (parts.length === 3)
        return parts[2];
    return value;
}

export function delay(ms: number) 
{
    return new Promise(resolve => setTimeout(resolve, ms));
}