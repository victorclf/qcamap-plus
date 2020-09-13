# qcamap-plus
A user script for Qcamap which provides a set of helper functions, e.g. merge categories, duplicate a category.

# How to use
1. Copy main.js into your browser console while on the coding view of Qcamap.
2. Wait for the console message "Project loaded".
3. Qcamap data is now available in `window.qm`.

# API

## Basic concepts
Marker: a section of highlighted text which has a category assigned to it

## Merge

Merge multiple categories. Change all markers of a list of categories to the same category.

```javascript
qm.merge('category 1', 'category 2', 'category 3', 'category 4');
// After the promise is resolved, all markers of categories 2, 3 and 4 will belong to category 1.
// Categories 2, 3 and 4 must be manually deleted if you want them gone.
```


## Duplicate
```javascript
qm.duplicate('code X');

// After the promise resolves, a new category called 'code X-copy' was created
and copies of all markers of 'code X' were created pointing to 'code X-copy'.
```



