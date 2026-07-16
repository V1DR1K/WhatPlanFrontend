export type Category={id:number;name:string;slug:string;icon:string;active:boolean};
export type HighlightTag={id:number;name:string;emoji:string};
export type PlaceStatus='PENDING'|'REVIEWED';
export type PlaceReview={author:string;comment?:string;location:number;heating:number;bathrooms:number;exterior:number;seating:number;service:number;ambiance:number};
export type Place={id:number;name:string;address?:string;sourceUrl?:string;mapsUrl?:string;status:PlaceStatus;category:Category;tags:HighlightTag[];author:string;rating:number;tasteAverage:number;priceAverage:number;venueAverage:number;itemCount:number;photoUrl?:string;thumbnailUrl?:string;photoWidth?:number;photoHeight?:number;reviews:PlaceReview[];createdAt:string};
export type Item={id:number;name:string;comment?:string;taste:number;price:number;author:string;photoUrl?:string;thumbnailUrl?:string;photoWidth?:number;photoHeight?:number;visitDate:string;createdAt:string};
export type Slice<T>={content:T[];nextCursor:number|null};
export type Session={token:string;username:string;role:'USER'|'ADMIN'};
