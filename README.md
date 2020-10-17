# qcamap-plus
An unofficial user script for Qcamap which provides a set of helper functions, e.g. merge categories, duplicate a category.


# How to use
1. Copy the contents of `main.js` into your browser console while on the coding view of Qcamap.
2. Wait for the console message: "Project loaded".
3. Qcamap data is now available in `window.qm` along with the helper functions.

Changes made with this script will only appear after refreshing the page  
because this script is not interacting with the app code.

This is EXPERIMENTAL. Make sure to BACKUP YOUR WORK. 


# API

## Basic concepts
* Marker: a section of highlighted text which has a category assigned to it

## Merge
Merge multiple categories. Change all markers of a list of categories to the same category.

```javascript
qm.merge('category 1', 'category 2', 'category 3', 'category 4');
// After the promise is resolved, all markers of categories 2, 3 and 4 will belong to category 1.
// Categories 2, 3 and 4 must be manually deleted if you want them gone.
```

## Duplicate
Creates a new category and copies all markers from another category to it.

```javascript
qm.duplicate('code X', 'code Y');

// After the promise resolves, a new category called 'code Y' will exist
// containing copies of all markers of 'code X'.
```

## Sort
Sort all categories alphabetically.

```javascript
qm.sortCategories();

// After the promise resolves, the categories will be alphabetically sorted.
```

## JSON dump
Dumps a JSON of all coding data in the console. Useful for backuping project data.

```javascript
qm.printJSON();

// Data will be in the browser console. Just copy and paste the object for backup.
```


# License
Copyright (C) 2020 Victor Luna Freire

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published
by the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
