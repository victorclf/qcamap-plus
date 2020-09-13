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

	* iterateMarkers() {
		for (const doc of this.documents) {
			for (const marker of doc.markers) {
				yield marker;
			}
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
		const promises = [];
		for (const otherCategory of otherCategories) {
			for (const marker of this.iterateMarkersOfCategory(otherCategory)) {
				console.log(`Changing marker (${marker.id}, ${marker.start}, ${marker.end}) from category ${otherCategory.name} to category ${baseCategory.name}`);
				marker.categoryId = baseCategory.id;
				const updatePromise = marker.update();
				promises.push(updatePromise);
			}
			// TODO remove empty category or rename it and leave removal up to user to avoid problems with potential bugs.
		}
		await Promise.all(promises);
	};

	/**
	 * Change all markers from categories listed in otherCategoriesNames to category baseCategoryName.
	 * @param baseCategoryName
	 * @param otherCategoriesNames
	 */
	async merge(baseCategoryName, ...otherCategoriesNames) {
		await this._merge(this.getCategoryByName(baseCategoryName), ...otherCategoriesNames.map(e => this.getCategoryByName(e)));
	}

	duplicate() {
		// TODO
		throw new Error(`Not implemented!`);
	};
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

	async createMarker() {
		// const markersPOSTURL = `https://www.qcamap.org/api/v1/projects/${this.project.projectId}/researchQuestions/${this.project.researchQuestionId}/contents/${this.id}/markers`;
		// const response = await fetch(markersPOSTURL, {
		// 	method: 'PUT',
		// 	headers: {
		// 		'Accept': 'application/json, text/plain, */*',
		// 		'Content-Type': 'application/json'
		// 	},
		// 	body: JSON.stringify(marker._data)
		// });
		// if (!response.ok) {
		// 	throw new Error(`HTTP error! status: ${response.status}`);
		// }
		// TODO
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

	async deleteMarker(marker) {
		// TODO
		// {"DELETE":{"scheme":"https","host":"www.qcamap.org","filename":"/api/v1/projects/26562/researchQuestions/39860/contents/138986/markers/2743588","remote":{"Address":"152.199.52.147:443"}}}
		throw new Error(`Not implemented!`);
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

	async delete() {
		await this.document.deleteMarker(this);
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
