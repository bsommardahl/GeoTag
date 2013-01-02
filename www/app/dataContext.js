define(["config"],function(config) {

	var onAjaxError = function() {
	};

	var get = function(url, data) {
		return send("GET", url, data);
	};
	var del = function(url, data) {
		return send("DELETE", url, data);
	};
	var put = function(url, data) {
		return send("PUT", url, data);
	};
	var post = function(url, data) {
		return send("POST", url, data);
	};

	var send = function(type, url, data) {

		var dataObj = ko.toJS(data || {});

		return $.ajax({
			url : config.ApiUrl + url,
			dataType : "json",
			type : type,
			data : dataObj,
		}).pipe(function(response, textStatus, jqXhr) {
			var deferred = new $.Deferred();
			if (response && response.Status == "error") {
				toastr.error(response.Message, response.ErrorType);
				return deferred.reject(response);
			} else {
				return deferred.resolve(response, textStatus, jqXhr);
			}
		}).fail(function(err) {
			onAjaxError(err);
		});
	};

	return {
		Users: {
			Get:function(username, password){
				
			}
		},
		Locations : {
			AddCurrentLocationAndRetrieveNearbyPlayers : function(playerId, currentX, currentY) {
				return post("/locations", {
					PlayerId : playerId,
					X : currentX,
					Y : currentY
				});
			}
		},
		Tag:{
			NearbyPlayer: function(taggerId, taggedId){
				return post("/tags", {Tagger : taggerId, Tagged: taggedId });
			}
		},
		SetOnAjaxError : function(callback) {
			onAjaxError = callback;
		}
	};
});
