(function(){
	//polyfill for matchesSelector
	if(!HTMLElement.prototype.matches) {
		var htmlprot = HTMLElement.prototype;

		htmlprot.matches =
			htmlprot.webkitMatchesSelector ||
				htmlprot.mozMatchesSelector ||
				htmlprot.msMatchesSelector ||
				htmlprot.oMatchesSelector ||
				function(selector) {
					//poorman's polyfill for matchesSelector
					var elements = this.parentElement.querySelectorAll(selector),
						i = 0,
						element;

					while(element = elements[i++]){
						if(element === this) return true;
					}
					return false;
				};
	}
})();
