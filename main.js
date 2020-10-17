/**
 * Add getters and setters in 'obj' for properties of 'obj._nestedObjName'.
 * @param obj object to modify
 * @param nestedObjName name of the nested object
 */
const addPropertiesForNestedObject = (obj, nestedObjName = '_data') => {
	for (const prop in obj[nestedObjName]) {
		Object.defineProperty(obj, prop, {
			get: function() { return this[nestedObjName][prop]; },
			set: function(value) { this[nestedObjName][prop] = value; }
		});
	}
};


class Project {
	constructor(projectId, researchQuestionId) {
		Object.assign(this, { projectId, researchQuestionId });
		this.documents = [];
		this.categories = [];
	}

	async load() {
		await Promise.all([
			this._loadDocuments(),
			this._loadCategories()
		]);
	}

	async _loadDocuments() {
		const documentsURL = `https://www.qcamap.org/api/v1/projects/${this.projectId}/contents`;
		const response = await fetch(documentsURL);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();

		// {"0":{"projectId":26562,"title":"review-15261.txt","ordering":1,"contentType":"text","contentLength":8772,
		// "contentWidth":null,"contentHeight":null,"id":138986,"createdAt":"2020-08-05T01:34:46Z","modifiedAt":null}}
		this.documents = [];
		const documentLoadPromises = [];
		for (const docJson of json) {
			const doc = new Document(this, docJson);
			this.documents.push(doc);
			documentLoadPromises.push(doc.load());
		}
		await Promise.all(documentLoadPromises);

		return this.documents;
	}

	async _loadCategories() {
		const categoriesURL = `https://www.qcamap.org/api/v1/projects/${this.projectId}/researchQuestions/${this.researchQuestionId}/categories`;
		const response = await fetch(categoriesURL);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();

		// {"0":{"type":"C","number":21,"ordering":1,"isInsignificant":0,"name":"not design","color":"#E4E4E4",
		// "definition":null,"anchorExamples":null,"codingRules":null,"researchQuestionId":39860,"mainCategoryId":null,
		// "id":644530,"createdAt":"2020-08-06T15:37:06Z","modifiedAt":null}}
		this.categories = [];
		for (const catJson of json) {
			this.categories.push(new Category(catJson));
		}
		return this.categories;
	}

	async createCategory(name) {
		const categoryData = {
			id: null,
			researchQuestionId: 39860,
			type: "C",
			number: null,
			ordering: null,
			isInsignificant: null,
			name: name,
			color: "#E4E4E4",
			definition: null,
			anchorExamples: null,
			codingRules: null,
			mainCategoryId: null
		}

		const categoriesPOSTURL = `https://www.qcamap.org/api/v1/projects/${this.projectId}/researchQuestions/${this.researchQuestionId}/categories`;
		const response = await fetch(categoriesPOSTURL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(categoryData)
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();

		const category = new Category(json);
		this.categories.push(category);

		return category;
	}

	async updateCategory(category) {
		const categoriesPUTURL = `https://www.qcamap.org/api/v1/projects/${this.projectId}/researchQuestions/${this.researchQuestionId}/categories/${category.id}`;
		const response = await fetch(categoriesPUTURL, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(category._data)
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	}

	* iterateMarkersOfCategory(category) {
		for (const doc of this.documents) {
			for (const marker of doc.markers) {
				if (marker.categoryId === category.id) {
					yield marker;
				}
			}
		}
	}

	getCategoryByName(name) {
		const category = this.categories.find(cat => cat.name === name);
		if (!category) {
			throw new Error(`Category ${name}  does not exist!`);
		}
		return category;
	}

	async _merge(baseCategory, ...otherCategories) {
		for (const otherCategory of otherCategories) {
			for (const marker of this.iterateMarkersOfCategory(otherCategory)) {
				console.log(`Changing marker (${marker.id}, ${marker.start}, ${marker.end}) from category ${otherCategory.name} to category ${baseCategory.name}`);
				marker.categoryId = baseCategory.id;
				await marker.update();
			}
			// TODO remove empty category or rename it and leave removal up to user to avoid problems with potential bugs.
		}
	};

	/**
	 * Change all markers from categories listed in otherCategoriesNames to category baseCategoryName.
	 * @param baseCategoryName
	 * @param otherCategoriesNames
	 */
	async merge(baseCategoryName, ...otherCategoriesNames) {
		await this._merge(this.getCategoryByName(baseCategoryName), ...otherCategoriesNames.map(e => this.getCategoryByName(e)));
		console.log(`Moved markers from categories ${otherCategoriesNames} to category ${baseCategoryName}.`);
	}

	async _duplicate(baseCategory, newCategoryName) {
		const newCategory = await this.createCategory(newCategoryName);
		for (const marker of this.iterateMarkersOfCategory(baseCategory)) {
			await marker.document.copyMarkerToOtherCategory(marker, newCategory);
		}
	};

	/**
	 * Creates a new category called newCategoryName and copies all markers of category baseCategoryName to it.
	 * @param baseCategoryName
	 * @param newCategoryName
	 */
	async duplicate(baseCategoryName, newCategoryName) {
		await this._duplicate(this.getCategoryByName(baseCategoryName), newCategoryName);
		console.log(`Created a copy of ${baseCategoryName} with name ${newCategoryName}.`);
	}

	/**
	 * Alphabetically sort all categories in order to find them more easily.
	 */
	async sortCategories() {
		const compareCategoryName = (a, b) => a.name < b.name
												? -1
												: (a.name > b.name
													? 1
													: 0);

		this.categories.sort(compareCategoryName);
		for (const [index, category] of this.categories.entries()) {
			category.ordering = index + 1; // add one because ordering in Qcamap starts from 1 instead of 0 like in JS.
		}

		// Sending all requests at once and using Promise.all() does not work for sorting.
		for (const category of this.categories) {
			await this.updateCategory(category);
		}

		console.log(`Sorted all ${this.categories.length} categories alphabetically.`);
	}

	/**
	 * Dumps a JSON of all Qcamap coding data in the console. Useful for backuping project data.
 	 */
	printJSON() {
		// A simple circular reference filter from MDN: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Errors/Cyclic_object_value
		const getCircularReplacer = () => {
			const seen = new WeakSet();
			return (key, value) => {
				if (typeof value === "object" && value !== null) {
					if (seen.has(value)) {
						return;
					}
					seen.add(value);
				}
				return value;
			};
		};

		// TODO Create a download link instead of dumping in console.
		console.log(JSON.stringify(this, getCircularReplacer(), 2));
	}
}


class Document {
	constructor(project, documentJson) {
		Object.assign(this, {project, _data: documentJson});
		addPropertiesForNestedObject(this);
		this.markers = [];
	}

	async load() {
		await this.loadMarkers();
	}

	async loadMarkers() {
		const markersURL = `https://www.qcamap.org/api/v1/projects/${this.project.projectId}/researchQuestions/${this.project.researchQuestionId}/contents/${this.id}/markers`;
		const response = await fetch(markersURL);
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();

		// {"0":{"start":305,"end":391,"categoryId":662724,"contentDefintionId":138986,"id":2732623,
		// "createdAt":"2020-09-08T21:25:41Z","modifiedAt":null}}
		this.markers = [];
		for (const markerJson of json) {
			this.markers.push(new Marker(this, markerJson));
		}
		return this.markers;
	}

	async copyMarkerToOtherCategory(marker, otherCategory) {
		// Using shallow copy here with Object.assign
		const newMarkerData = Object.assign({}, marker._data);
		newMarkerData.id = null;
		newMarkerData.categoryId = otherCategory.id;

		const markersPOSTURL = `https://www.qcamap.org/api/v1/projects/${this.project.projectId}/researchQuestions/${this.project.researchQuestionId}/contents/${this.id}/markers`;
		const response = await fetch(markersPOSTURL, {
			method: 'POST',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(newMarkerData)
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
		const json = await response.json();
		// {"id": 123, "categoryId": 6644, "contentDefintionId":null, "researchQuestionId":398, "interCoderAgreementId":null, "start":28, "end":36};

		const newMarker = new Marker(this, json);
		this.markers.push(newMarker);

		return newMarker;
	}

	async updateMarker(marker) {
		const markersPUTURL = `https://www.qcamap.org/api/v1/projects/${this.project.projectId}/researchQuestions/${this.project.researchQuestionId}/contents/${this.id}/markers/${marker.id}`;
		const response = await fetch(markersPUTURL, {
			method: 'PUT',
			headers: {
				'Accept': 'application/json, text/plain, */*',
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(marker._data)
		});
		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}
	}
}


class Category {
	constructor(categoryJson) {
		Object.assign(this, {_data: categoryJson});
		addPropertiesForNestedObject(this);
	}

}


class Marker {
	constructor(document, markerJson) {
		if (!document || !markerJson) {
			throw new Error("invalid parameters");
		}
		Object.assign(this, {document, _data: markerJson});
		addPropertiesForNestedObject(this);
	}

	async update() {
		await this.document.updateMarker(this);
	}
}


const initProject = async () => {
	const qcamapUrlRegex = /https:\/\/www.qcamap.org\/ui\/projects\/(?<projectId>[0-9]+)\/rq\/(?<researchQuestionId>[0-9]+)\/coding/;
	const match = window.location.href.match(qcamapUrlRegex);
	const projectId = match && match.groups.projectId;
	const researchQuestionId = match && match.groups.researchQuestionId;
	if (!match || !projectId || !researchQuestionId) {
		throw new Error("Current URL doesn't match Qcamap coding view.");
	}

	const proj = new Project(projectId, researchQuestionId);
	await proj.load();
	return proj;
}


initProject().then(project => {
	console.log("Project loaded.");
	window.qm = project;
});
